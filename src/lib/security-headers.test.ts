import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const SUPABASE = "https://abcdefgh.supabase.co";

/** The policy as a map: directive -> its sources. */
function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...sources] = part.split(/\s+/);
        return [name!, sources];
      }),
  );
}

function headerMap(headers: { key: string; value: string }[]) {
  return new Map(headers.map((h) => [h.key, h.value]));
}

describe("contentSecurityPolicy (production)", () => {
  const policy = directives(
    contentSecurityPolicy({ supabaseUrl: SUPABASE, isDevelopment: false }),
  );

  it("only allows this site by default", () => {
    expect(policy.get("default-src")).toEqual(["'self'"]);
  });

  it("blocks plugins, framing, other base URLs and posting forms elsewhere", () => {
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("frame-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'self'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
  });

  it("loads scripts only from this site, and never allows eval", () => {
    const script = policy.get("script-src") ?? [];
    expect(script).toContain("'self'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script.filter((s) => s.startsWith("http"))).toEqual([]);
    expect(script).not.toContain("*");
  });

  it("talks only to this site and the Supabase project", () => {
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      SUPABASE,
      "wss://abcdefgh.supabase.co",
    ]);
  });

  it("shows images from this site and the Supabase project only", () => {
    expect(policy.get("img-src")).toEqual([
      "'self'",
      "data:",
      "blob:",
      SUPABASE,
    ]);
  });

  it("upgrades http to https", () => {
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
  });

  it("has no wildcard anywhere", () => {
    for (const [name, sources] of policy) {
      expect(sources, name).not.toContain("*");
    }
  });
});

describe("contentSecurityPolicy (development)", () => {
  const policy = directives(
    contentSecurityPolicy({ supabaseUrl: SUPABASE, isDevelopment: true }),
  );

  it("allows what hot reload and React's dev tools need", () => {
    expect(policy.get("script-src")).toContain("'unsafe-eval'");
    expect(policy.get("connect-src")).toEqual(
      expect.arrayContaining(["ws:", "wss:"]),
    );
    expect(policy.has("upgrade-insecure-requests")).toBe(false);
  });
});

describe("contentSecurityPolicy with a missing or odd Supabase URL", () => {
  it("leaves it out instead of writing something broken", () => {
    for (const supabaseUrl of [undefined, "", "not a url", "javascript:x"]) {
      const policy = directives(
        contentSecurityPolicy({ supabaseUrl, isDevelopment: false }),
      );
      expect(policy.get("connect-src")).toEqual(["'self'"]);
    }
  });

  it("keeps only the origin of the URL", () => {
    const policy = directives(
      contentSecurityPolicy({
        supabaseUrl: `${SUPABASE}/rest/v1/; script-src *`,
        isDevelopment: false,
      }),
    );
    expect(policy.get("connect-src")).toContain(SUPABASE);
    expect(policy.get("script-src")).not.toContain("*");
  });
});

describe("securityHeaders", () => {
  const headers = headerMap(
    securityHeaders({ supabaseUrl: SUPABASE, isDevelopment: false }),
  );

  it("keeps every header the app had before the CSP, unchanged", () => {
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    );
  });

  it("adds the CSP and the opener policy", () => {
    expect(headers.get("Content-Security-Policy")).toBe(
      contentSecurityPolicy({ supabaseUrl: SUPABASE, isDevelopment: false }),
    );
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });
});

describe("next.config.ts", () => {
  it("sends the security headers on every route and hides X-Powered-By", async () => {
    const config = nextConfig("phase-test");
    expect(config.poweredByHeader).toBe(false);

    const rules = (await config.headers?.()) ?? [];
    const everyRoute = rules.find((rule) => rule.source === "/:path*");
    expect(everyRoute).toBeDefined();

    const sent = headerMap(everyRoute!.headers);
    for (const key of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]) {
      expect(sent.get(key), key).toBeTruthy();
    }
    expect(sent.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });
});
