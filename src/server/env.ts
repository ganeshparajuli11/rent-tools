import "server-only";

import {
  formatEnvError,
  isEnvValidationSkipped,
  serverEnvSchema,
  type ServerEnv,
} from "@/lib/env";

/**
 * Secret, server-only environment variables (service role key, Resend,
 * Upstash). This is the only place that reads them. The "server-only" import
 * makes the build fail if a Client Component ever imports this file.
 */
function parseServerEnv(): ServerEnv {
  const raw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  };

  if (isEnvValidationSkipped) {
    return raw as ServerEnv;
  }

  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatEnvError(result.error)}`,
    );
  }
  return result.data;
}

export const serverEnv = parseServerEnv();
