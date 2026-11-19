import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { exportFileName } from "@/lib/csv";
import { todayInLondon } from "@/lib/dates";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { exportKindSchema } from "@/lib/validation/data-rights";
import { getCurrentUser } from "@/server/auth";
import { UserFacingError } from "@/server/context";
import {
  exportData,
  OWNERS_ONLY_EXPORT,
  TOO_MUCH_TO_EXPORT,
} from "@/server/data-export";

/**
 * "Download your data" from the Settings page:
 *   GET /api/export?data=homes | tenants | payments
 *
 * Returns a CSV file for the signed-in user's organisation. In order:
 *  1. the session (no session: back to sign-in);
 *  2. the rate limiter, per user;
 *  3. Zod on `data` (anything else is refused);
 *  4. exportData, which derives the organisation on the server, allows
 *     owners only, uses the user's own client (RLS applies) and writes
 *     audit_log.
 * A problem sends the person back to Settings with a plain message there,
 * never an error page or any detail of what went wrong.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  let problem: "too-many" | "owners-only" | "too-big" | "failed";
  try {
    const limit = await rateLimit("export", user.id, 10, "10 m");
    if (!limit.success) {
      problem = "too-many";
    } else {
      const kind = exportKindSchema.safeParse(
        request.nextUrl.searchParams.get("data"),
      );
      if (!kind.success) {
        problem = "failed";
      } else {
        const supabase = await createClient();
        const { csv } = await exportData(
          { supabase, userId: user.id },
          kind.data,
        );
        const fileName = exportFileName(kind.data, todayInLondon());
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Cache-Control": "private, no-store",
          },
        });
      }
    }
  } catch (error) {
    if (
      error instanceof UserFacingError &&
      error.message === OWNERS_ONLY_EXPORT
    ) {
      problem = "owners-only";
    } else if (
      error instanceof UserFacingError &&
      error.message === TOO_MUCH_TO_EXPORT
    ) {
      problem = "too-big";
    } else {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;
      console.error("[export] failed", { code });
      problem = "failed";
    }
  }

  redirect(`/settings?export=${problem}`);
}
