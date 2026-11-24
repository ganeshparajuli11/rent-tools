import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import type { Role } from "@/lib/roles";

/**
 * Guards for every way the browser can change data: server actions and
 * route handlers. These read the source files, so a new action that skips a
 * step fails `pnpm test` straight away.
 *
 * Every server action in the signed-in area must:
 *  - validate its input with a shared Zod schema (`.safeParse(`),
 *  - go through `runAction` (src/server/run-action.ts), which checks the
 *    session and applies the rate limiter, and
 *  - call a data function in src/server/ that derives the organisation on
 *    the server and checks the person's role (`requireRole`, with the role
 *    listed in DATA_FUNCTION_ROLES below), and writes `audit_log`
 *    (`writeAudit`).
 *
 * The sign-in actions run before there is a session, so they are listed
 * by name below and checked for a rate limit and Zod instead. Every route
 * handler must apply the rate limiter; cron routes must check the secret.
 */

const SRC = join(process.cwd(), "src");

type SourceFile = { path: string; text: string };

function sourceFiles(): SourceFile[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => ({
      path: relative(SRC, join(SRC, name)).split(sep).join("/"),
      text: readFileSync(join(SRC, name), "utf8"),
    }));
}

/** The text of a top-level function, from its name to its closing brace. */
function functionBody(text: string, name: string): string | null {
  const start = text.search(
    new RegExp(`^(export )?(async )?function ${name}\\b`, "m"),
  );
  if (start === -1) return null;
  const end = text.indexOf("\n}\n", start);
  return text.slice(start, end === -1 ? undefined : end + 2);
}

/**
 * A function's text plus the text of the functions in the same file that it
 * calls (and so on), so an action that hands over to a local helper, like
 * `archiveRoomAction` -> `setRoomArchived`, is checked as a whole.
 */
function expandedBody(
  text: string,
  name: string,
  seen = new Set<string>(),
): string {
  seen.add(name);
  const body = functionBody(text, name) ?? "";
  let expanded = body;
  for (const [, called] of body.matchAll(/(?<![.\w])(\w+)\(/g)) {
    if (seen.has(called!)) continue;
    if (functionBody(text, called!) === null) continue;
    expanded += `\n${expandedBody(text, called!, seen)}`;
  }
  return expanded;
}

function exportedFunctions(text: string): string[] {
  return [...text.matchAll(/^export async function (\w+)/gm)].map(
    (match) => match[1]!,
  );
}

/** `import * as homes from "@/server/homes"` -> { homes: "server/homes.ts" }. */
function serverModules(text: string): Map<string, string> {
  return new Map(
    [
      ...text.matchAll(/^import \* as (\w+) from "@\/server\/([\w-]+)";$/gm),
    ].map((match) => [match[1]!, `server/${match[2]}.ts`]),
  );
}

/** Sign-in actions: no session exists yet. Reviewed by hand; see above. */
const SIGN_IN_ACTIONS: Record<string, "input" | "no-input"> = {
  requestSignInCode: "input",
  verifySignInCode: "input",
  resendSignInCode: "no-input",
  signInWithPassword: "input",
  signUpWithPassword: "input",
  requestPasswordReset: "input",
  setNewPassword: "input",
  signOut: "no-input",
};

/**
 * Data functions that an action may call without writing `audit_log`,
 * because they change nothing. Each still derives the organisation.
 * Reviewed by hand: add to this list only with a reason.
 */
const NO_AUDIT_DATA_FUNCTIONS: Record<string, string> = {
  // Only works out a Storage path for the browser to upload to; the photo
  // row (and its audit_log entry) is written later by photos.addPhoto.
  "photos.preparePhotoUpload": "writes nothing",
  // The ⌘K search only reads. A search term is often a person's name, which
  // the audit log must never hold.
  "search.searchRecords": "reads only",
};

/**
 * Data functions for a person who has no organisation yet, so there is
 * none to look up. Each must hand over to a database function that checks
 * the session itself and writes audit_log in the same transaction.
 * Reviewed by hand: add to this list only with a reason.
 */
const ORGANISATION_SETUP_DATA_FUNCTIONS: Record<string, RegExp> = {
  // public.create_organisation: works out the caller from the session,
  // refuses a second organisation, makes them owner, writes audit_log.
  "organisation.setUpOrganisation": /\.rpc\("create_organisation",/,
};

/**
 * The least role each data function behind a server action needs
 * (PRODUCT_SPEC.md §5: owner > admin > manager > staff). The guard checks
 * the function starts with `requireRole(ctx, "<role>")`, so changing a
 * role limit means changing this list too. Row-level security enforces the
 * same limits in the database (supabase/migrations/20261124030000_*).
 * A new data function must be added here, with its role.
 */
const DATA_FUNCTION_ROLES: Record<string, Role> = {
  // Homes, rooms and photos: managers and above.
  "homes.createHome": "manager",
  "homes.updateHome": "manager",
  "homes.setHomeArchived": "manager",
  "homes.addRoom": "manager",
  "homes.renameRoom": "manager",
  "homes.setRoomArchived": "manager",
  "photos.preparePhotoUpload": "manager",
  "photos.addPhoto": "manager",
  "photos.removePhoto": "manager",
  // Tenants: managers and above. Removing a past tenant's details cannot
  // be undone: owners only.
  "tenants.createTenant": "manager",
  "tenants.updateTenant": "manager",
  "tenants.moveTenantOut": "manager",
  "tenants.undoMoveTenantOut": "manager",
  "tenants.removeTenantDetails": "owner",
  // Rent payments are operational: every role, staff included.
  "rent.recordPayment": "staff",
  "rent.removePayment": "staff",
  "rent.restorePayment": "staff",
  // Organisation settings: owners only.
  "settings.setOverdueEmailEnabled": "owner",
  // Reads only: anyone in the organisation (getOrganisationId is enough).
  "search.searchRecords": "staff",
};

const files = sourceFiles();
const byPath = new Map(files.map((file) => [file.path, file]));
// `actions.ts`, or a named one such as `photo-actions.ts`.
const actionFiles = files.filter((file) =>
  /(^|\/)([\w-]+-)?actions\.ts$/.test(file.path),
);
// The signed-in area, plus organisation set-up (signed in, before the shell).
const appActionFiles = actionFiles.filter(
  (file) =>
    file.path.startsWith("app/(app)/") || file.path.startsWith("app/(setup)/"),
);
const routeFiles = files.filter((file) => /(^|\/)route\.ts$/.test(file.path));

describe("server actions", () => {
  it("finds the action files", () => {
    expect(appActionFiles.map((f) => f.path).sort()).toEqual(
      expect.arrayContaining([
        "app/(app)/homes/actions.ts",
        "app/(app)/homes/photo-actions.ts",
        "app/(app)/rent/actions.ts",
        "app/(app)/search/actions.ts",
        "app/(app)/settings/actions.ts",
        "app/(app)/tenants/actions.ts",
        "app/(setup)/setup/actions.ts",
      ]),
    );
  });

  it('every action file starts with "use server"', () => {
    for (const file of actionFiles) {
      expect(file.text, file.path).toMatch(/^"use server";/);
    }
  });

  it("server actions live only in actions.ts files", () => {
    const others = files
      .filter((file) => !actionFiles.includes(file))
      .filter((file) => /^\s*["']use server["']/m.test(file.text))
      .map((file) => file.path);
    expect(others).toEqual([]);
  });

  describe.each(
    appActionFiles.map((file): [string, SourceFile] => [file.path, file]),
  )("%s", (_path, file) => {
    const names = exportedFunctions(file.text);
    const modules = serverModules(file.text);
    // `const run = (...) => runAction(...)` is the same as runAction.
    const hasRunAlias = /const run = [\s\S]*?runAction\(/.test(file.text);

    it("has actions", () => {
      expect(names.length).toBeGreaterThan(0);
    });

    it.each(names)(
      "%s validates with Zod and goes through runAction",
      (name) => {
        const body = expandedBody(file.text, name);
        expect(body, name).toMatch(/\.safeParse\(/);
        const viaRunAction = /\brunAction\(/.test(body);
        const viaAlias = hasRunAlias && /\brun\(/.test(body);
        expect(viaRunAction || viaAlias, name).toBe(true);
      },
    );

    it.each(names)(
      "%s calls data functions that scope by organisation and write audit_log",
      (name) => {
        const body = expandedBody(file.text, name);
        const calls = [...body.matchAll(/\b(\w+)\.(\w+)\(/g)].filter((match) =>
          modules.has(match[1]!),
        );
        expect(calls.length, `${name} calls no data function`).toBeGreaterThan(
          0,
        );
        for (const [, alias, fn] of calls) {
          const dataFile = byPath.get(modules.get(alias!)!);
          expect(dataFile, `${alias}`).toBeDefined();
          const dataBody = functionBody(dataFile!.text, fn!) ?? "";
          const setup = ORGANISATION_SETUP_DATA_FUNCTIONS[`${alias}.${fn}`];
          if (setup) {
            expect(dataBody, `${alias}.${fn}`).toMatch(setup);
            continue;
          }
          const role = DATA_FUNCTION_ROLES[`${alias}.${fn}`];
          expect(
            role,
            `${alias}.${fn} needs a role in DATA_FUNCTION_ROLES`,
          ).toBeDefined();
          const readsOnly = Boolean(NO_AUDIT_DATA_FUNCTIONS[`${alias}.${fn}`]);
          if (readsOnly && role === "staff") {
            // Any active member: the organisation look-up is the check.
            expect(dataBody, `${alias}.${fn}`).toMatch(
              /getOrganisationId\(ctx\)|requireRole\(ctx, "staff"\)/,
            );
          } else {
            expect(dataBody, `${alias}.${fn}`).toContain(
              `requireRole(ctx, "${role}")`,
            );
          }
          if (NO_AUDIT_DATA_FUNCTIONS[`${alias}.${fn}`]) continue;
          expect(dataBody, `${alias}.${fn}`).toMatch(/writeAudit\(ctx,/);
        }
      },
    );
  });

  it("runAction checks the session and applies the rate limiter", () => {
    const body =
      functionBody(byPath.get("server/run-action.ts")!.text, "runAction") ?? "";
    expect(body).toMatch(/getCurrentUser\(\)/);
    expect(body).toMatch(/if \(!user\)/);
    expect(body).toMatch(/rateLimit\(/);
    expect(body).toMatch(/if \(!limit\.success\)/);
    // The user's own client, so RLS applies.
    expect(body).toMatch(/createClient\(\)/);
    expect(body).not.toMatch(/service/i);
  });

  it("every role in DATA_FUNCTION_ROLES belongs to a real data function", () => {
    for (const key of Object.keys(DATA_FUNCTION_ROLES)) {
      const [module, fn] = key.split(".");
      const file = byPath.get(`server/${module}.ts`);
      expect(file, key).toBeDefined();
      expect(functionBody(file!.text, fn!), key).not.toBeNull();
    }
  });

  it("requireRole reads active memberships only and checks the rank", () => {
    const context = byPath.get("server/context.ts")!.text;
    expect(functionBody(context, "getMembership")).toMatch(
      /\.eq\("status", "active"\)/,
    );
    expect(functionBody(context, "getOrganisationId")).toMatch(
      /getMembership\(ctx\)/,
    );
    const requireRole = functionBody(context, "requireRole") ?? "";
    expect(requireRole).toMatch(/getMembership\(ctx\)/);
    expect(requireRole).toMatch(/hasRole\(membership\.role, min\)/);
    expect(requireRole).toMatch(/throw new UserFacingError\(/);
  });

  it("the sign-in actions are the known ones, rate limited and validated", () => {
    const file = byPath.get("app/(auth)/actions.ts")!;
    expect(exportedFunctions(file.text).sort()).toEqual(
      Object.keys(SIGN_IN_ACTIONS).sort(),
    );
    for (const [name, kind] of Object.entries(SIGN_IN_ACTIONS)) {
      if (kind !== "input") continue;
      const body = functionBody(file.text, name) ?? "";
      expect(body, name).toMatch(/\.safeParse\(/);
      expect(body, name).toMatch(/isRateLimited\(|sendCode\(/);
    }
    expect(functionBody(file.text, "sendCode")).toMatch(/isRateLimited\(/);
    expect(functionBody(file.text, "isRateLimited")).toMatch(/rateLimit\(/);
  });
});

describe("route handlers", () => {
  it("finds the route handlers", () => {
    expect(routeFiles.map((f) => f.path)).toEqual(
      expect.arrayContaining([
        "app/api/cron/overdue-reminders/route.ts",
        "app/api/cron/rent-charges/route.ts",
        "app/api/export/route.ts",
        "app/auth/confirm/route.ts",
      ]),
    );
  });

  it("the data download checks the session, validates, and is owners only", () => {
    const route = byPath.get("app/api/export/route.ts")!.text;
    expect(route).toMatch(/getCurrentUser\(\)/);
    expect(route).toMatch(/if \(!user\) redirect\(/);
    expect(route).toMatch(/exportKindSchema\.safeParse\(/);
    // The rate limit comes before any data is read.
    expect(route.indexOf("rateLimit(")).toBeLessThan(
      route.indexOf("exportData("),
    );
    expect(route).not.toMatch(/service/i);

    const data = functionBody(
      byPath.get("server/data-export.ts")!.text,
      "exportData",
    );
    expect(data).toMatch(/getOrganisationId\(ctx\)/);
    expect(data).toMatch(/isOrganisationOwner\(ctx, organisationId\)/);
    expect(data).toMatch(/writeAudit\(ctx,/);
  });

  it.each(routeFiles.map((file): [string, SourceFile] => [file.path, file]))(
    "%s applies the rate limiter",
    (_path, file) => {
      expect(file.text).toMatch(/\brateLimit\(/);
    },
  );

  it.each(
    routeFiles
      .filter((file) => file.path.startsWith("app/api/cron/"))
      .map((file): [string, SourceFile] => [file.path, file]),
  )("%s checks the cron secret before doing anything", (_path, file) => {
    const auth = file.text.indexOf("isCronAuthorised(");
    expect(auth).toBeGreaterThan(-1);
    // Nothing is read or written before the secret is checked.
    expect(file.text.indexOf("createServiceClient()")).toBeGreaterThan(auth);
  });
});
