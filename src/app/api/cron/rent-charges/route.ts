import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorised, isCronSecretUsable } from "@/lib/cron-secret";
import { rateLimit } from "@/lib/rate-limit";
import { getServerEnv } from "@/server/env";
import { generateAllRentCharges } from "@/server/rent-charges";
import { getClientIp } from "@/server/request";
import { createServiceClient } from "@/server/service-client";

/**
 * Daily cron job: makes this month's rent charge for every tenant, and fills
 * in any earlier month that is missing. Safe to run any number of times.
 *
 *   GET /api/cron/rent-charges
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Vercel Cron calls it once a day (see vercel.json) and sends that header
 * itself when CRON_SECRET is set in the project's environment variables.
 *
 * There is no signed-in user, so this is the ONE place the service-role
 * client is used. Protection, in order:
 *  1. a rate limit per caller, so the secret cannot be guessed quickly;
 *  2. the secret header. No secret set, or a wrong one: refused, and nothing
 *     is read or written.
 * The job takes no input from the request. Each new charge takes its
 * organisation from its own tenancy row.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = await rateLimit(
      "cron-rent-charges",
      await getClientIp(),
      10,
      "60 s",
    );
    if (!limit.success) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const secret = getServerEnv().CRON_SECRET;
    if (!isCronSecretUsable(secret)) {
      console.warn(
        "[cron] CRON_SECRET is not set (or is under 16 characters): request refused.",
      );
    }
    if (!isCronAuthorised(request.headers.get("authorization"), secret)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const result = await generateAllRentCharges(createServiceClient());
    console.info("[cron] rent charges", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[cron] rent charges failed", { code });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
