import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. On Vercel, x-forwarded-for is set
 * by the platform and its first entry is the real client.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
