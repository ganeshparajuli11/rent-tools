import "server-only";

import {
  formatEnvError,
  isEnvValidationSkipped,
  serverEnvSchema,
  type ServerEnv,
} from "@/lib/env";

/**
 * Secret, server-only environment variables (service role key, Resend and
 * the sender address, Upstash, the cron secret). This is the only place that reads them. The "server-only" import
 * makes the build fail if a Client Component ever imports this file.
 */
let cachedServerEnv: ServerEnv | undefined;

/**
 * Validated on first call, not on import, so `next build` doesn't need
 * production-only secrets just because a page imports a server action.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const raw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
  };

  if (isEnvValidationSkipped) {
    cachedServerEnv = raw as ServerEnv;
    return cachedServerEnv;
  }

  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatEnvError(result.error)}`,
    );
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}
