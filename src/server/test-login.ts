import "server-only";

/**
 * Password sign-in for testing only.
 *
 * Real users sign in with an email code. While the app is being tested, the
 * demo account made by `pnpm seed:demo` can sign in with a password instead.
 *
 * It is OFF unless ENABLE_TEST_LOGIN is exactly "true", and even then only
 * the demo email (TEST_LOGIN_EMAIL, default test@rentdesk.test) may use it.
 * Turn it off (remove the variable in Vercel and redeploy) before real
 * landlords use the app.
 */

export const DEFAULT_TEST_LOGIN_EMAIL = "test@rentdesk.test";

export function isTestLoginEnabled(): boolean {
  return process.env.ENABLE_TEST_LOGIN === "true";
}

export function testLoginEmail(): string {
  return (
    process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase() ||
    DEFAULT_TEST_LOGIN_EMAIL
  );
}
