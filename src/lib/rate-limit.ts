import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getServerEnv } from "@/server/env";

/**
 * Reusable rate limiter backed by Upstash Redis.
 *
 * When the Upstash env vars are missing (local development), limiting is
 * skipped and every request is allowed. In production the env validation in
 * src/server/env.ts requires them, so limiting can't be switched off silently.
 *
 * Usage (server code only):
 *   const { success } = await rateLimit("login", ip);
 *   if (!success) return { error: "Too many tries. Please wait a minute." };
 */

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix time in milliseconds when the window resets. */
  reset: number;
  /** True when no limiter is configured and the check was skipped. */
  skipped: boolean;
};

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis === undefined) {
    const env = getServerEnv();
    redis =
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null;
  }
  return redis;
}

const limiters = new Map<string, Ratelimit>();
let warnedMissing = false;

function getLimiter(name: string, requests: number, window: Duration) {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${name}:${requests}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `rentdesk:ratelimit:${name}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/**
 * Check a rate limit.
 * @param name       what is being limited, e.g. "login" or "invite-email"
 * @param identifier who is being limited, e.g. an IP address or user id
 * @param requests   allowed requests per window (default 10)
 * @param window     window length, e.g. "60 s" or "1 h" (default "60 s")
 */
export async function rateLimit(
  name: string,
  identifier: string,
  requests = 10,
  window: Duration = "60 s",
): Promise<RateLimitResult> {
  const limiter = getLimiter(name, requests, window);

  if (!limiter) {
    if (!warnedMissing && process.env.NODE_ENV !== "test") {
      warnedMissing = true;
      console.warn(
        "[rate-limit] Upstash env vars not set: rate limiting is skipped.",
      );
    }
    return {
      success: true,
      limit: requests,
      remaining: requests,
      reset: 0,
      skipped: true,
    };
  }

  const { success, limit, remaining, reset } = await limiter.limit(
    `${name}:${identifier}`,
  );
  return { success, limit, remaining, reset, skipped: false };
}
