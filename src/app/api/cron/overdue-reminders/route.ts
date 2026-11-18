import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorised, isCronSecretUsable } from "@/lib/cron-secret";
import { getPublicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { isEmailConfigured, sendEmail } from "@/server/email";
import { getServerEnv } from "@/server/env";
import {
  ownerEmailLookup,
  sendOverdueDigests,
} from "@/server/overdue-reminders";
import { getClientIp } from "@/server/request";
import { createServiceClient } from "@/server/service-client";

/**
 * Daily cron job: emails each organisation's owners a list of late rent,
 * unless they turned it off in Settings. At most once a day each.
 *
 *   GET /api/cron/overdue-reminders
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Vercel Cron calls it once a day (see vercel.json). Protection, in order:
 *  1. a rate limit per caller;
 *  2. the secret header. No secret set, or a wrong one: refused, and
 *     nothing is read or sent.
 * With no RESEND_API_KEY or EMAIL_FROM it stops there: nothing is read and
 * nothing is sent. The job takes no input from the request.
 *
 * Like the rent-charges job, it has no signed-in user, so it uses the
 * service-role client: to read every organisation's late rent, and to look
 * up owners' email addresses in Supabase Auth.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = await rateLimit(
      "cron-overdue-reminders",
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

    if (!isEmailConfigured()) {
      console.info(
        "[cron] late rent email skipped: RESEND_API_KEY or EMAIL_FROM is not set.",
      );
      return NextResponse.json({ ok: true, skipped: "email-not-configured" });
    }

    const db = createServiceClient();
    const result = await sendOverdueDigests(db, {
      appUrl: getPublicEnv().NEXT_PUBLIC_APP_URL,
      send: sendEmail,
      recipientsFor: ownerEmailLookup(db),
    });
    console.info("[cron] late rent email", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[cron] late rent email failed", { code });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
