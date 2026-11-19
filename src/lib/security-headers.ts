/**
 * Security headers for every response, used by next.config.ts.
 *
 * Content-Security-Policy: what the browser may load and where it may send
 * data. Everything is limited to this site, except:
 *  - inline scripts and styles. Next.js puts small inline scripts in every
 *    page, and next-themes adds one before the page draws. Allowing them by
 *    nonce instead would make every page render on each request and needs
 *    testing in a real browser, so it is a later step. Everything else is
 *    still locked down: no plugins, no other sites' scripts, no framing, no
 *    changing the base URL, and forms only post back to this site.
 *  - the Supabase project URL, for connect-src (and its websocket) and for
 *    img-src, because home photos are shown from Supabase Storage with
 *    signed links.
 *  - in development only: 'unsafe-eval' (React's dev tools) and websockets
 *    for hot reload.
 */

export type SecurityHeader = { key: string; value: string };

/** "https://abc.supabase.co/" -> "https://abc.supabase.co", or null. */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({
  supabaseUrl,
  isDevelopment,
}: {
  supabaseUrl?: string;
  isDevelopment: boolean;
}): string {
  const supabase = originOf(supabaseUrl);
  const supabaseSocket = supabase?.replace(/^http/, "ws") ?? null;

  const connect = ["'self'"];
  if (supabase) connect.push(supabase);
  if (supabaseSocket) connect.push(supabaseSocket);
  if (isDevelopment) connect.push("ws:", "wss:");

  // Home photos are private Storage files shown through signed links.
  const img = ["'self'", "data:", "blob:"];
  if (supabase) img.push(supabase);

  const script = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) script.push("'unsafe-eval'");

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", script],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", img],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connect],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["frame-src", ["'none'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];

  const policy = directives.map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  );
  // Local development runs on plain http://localhost.
  if (!isDevelopment) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(options: {
  supabaseUrl?: string;
  isDevelopment: boolean;
}): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(options),
    },
    {
      // Force HTTPS for 2 years, including subdomains.
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Block the app from being shown inside iframes (clickjacking). The CSP
    // says the same with frame-ancestors; this covers older browsers.
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    // Keep this site's window apart from windows it opens or is opened by.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
