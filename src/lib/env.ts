import { z } from "zod";

/**
 * Environment variable validation.
 *
 * - `getPublicEnv()` returns the NEXT_PUBLIC_* values. They are safe in the browser.
 *   Each one must be read with a literal `process.env.NEXT_PUBLIC_...` so that
 *   Next.js can inline it into the client bundle.
 * - `serverEnvSchema` only *describes* the secret, server-only variables. It
 *   never reads them. They are read and validated in `src/server/env.ts`, which
 *   imports "server-only" so a secret can never end up in browser code.
 *
 * `next.config.ts` calls `getPublicEnv()` when `next dev` / `next build` start,
 * so they fail fast with a clear message when a public variable is missing.
 *
 * Set SKIP_ENV_VALIDATION=1 to skip validation (for example, a CI build that
 * has no real keys). The app will not work against Supabase in that mode.
 */

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "1" ||
  process.env.SKIP_ENV_VALIDATION === "true";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export const serverEnvSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      Boolean(env.UPSTASH_REDIS_REST_URL) ===
      Boolean(env.UPSTASH_REDIS_REST_TOKEN),
    {
      message:
        "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither.",
    },
  )
  .refine(
    (env) =>
      process.env.NODE_ENV !== "production" ||
      Boolean(env.UPSTASH_REDIS_REST_URL),
    {
      message:
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production so rate limiting works.",
    },
  );

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

let cachedPublicEnv: PublicEnv | undefined;

/**
 * Returns the validated public env. Throws a readable error if a value is
 * missing or wrong. Validation runs once, on first call (not on import), so
 * tools like `next typegen` can load the config without real keys.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  };

  if (skipValidation) {
    cachedPublicEnv = raw as PublicEnv;
    return cachedPublicEnv;
  }

  const result = publicEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatEnvError(result.error)}\n` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
  cachedPublicEnv = result.data;
  return cachedPublicEnv;
}

/** True when the Supabase URL and publishable key are present. */
export function hasSupabaseEnv(): boolean {
  const env = getPublicEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export { skipValidation as isEnvValidationSkipped };
