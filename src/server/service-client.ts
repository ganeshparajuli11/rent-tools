import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

import type { Db } from "./context";
import { getServerEnv } from "./env";

/**
 * A Supabase client with the service-role key. It BYPASSES row-level
 * security, so it can read and write every organisation's data.
 *
 * It exists for one job: the daily cron route that makes rent charges, which
 * has no signed-in user. Do not import it anywhere else. Pages and server
 * actions must use the signed-in user's own client (src/lib/supabase/server.ts)
 * so RLS applies. A unit test (service-client.guard.test.ts) fails if any
 * other file imports this one.
 */
export function createServiceClient(): Db {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("The service-role client is not configured.");
  }

  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
