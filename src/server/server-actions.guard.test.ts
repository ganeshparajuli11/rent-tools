import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

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
 *    the server (`getOrganisationId`) and writes `audit_log` (`writeAudit`).
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
  signInWithTestPassword: "input",
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
};

const files = sourceFiles();
const byPath = new Map(files.map((file) => [file.path, file]));
// `actions.ts`, or a named one such as `photo-actions.ts`.
const actionFiles = files.filter((file) =>
  /(^|\/)([\w-]+-)?actions\.ts$/.test(file.path),
);
const appActionFiles = actionFiles.filter((file) =>
  file.path.startsWith("app/(app)/"),
);
const routeFiles = files.filter((file) => /(^|\/)route\.ts$/.test(file.path));

describe("server actions", () => {
  it("finds the action files", () => {
    expect(appActionFiles.map((f) => f.path).sort()).toEqual(
      expect.arrayContaining([
        "app/(app)/homes/actions.ts",
        "app/(app)/homes/photo-actions.ts",
        "app/(app)/rent/actions.ts",
        "app/(app)/settings/actions.ts",
        "app/(app)/tenants/actions.ts",
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
          expect(dataBody, `${alias}.${fn}`).toMatch(
            /getOrganisationId\(ctx\)/,
          );
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
        "app/auth/confirm/route.ts",
      ]),
    );
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
