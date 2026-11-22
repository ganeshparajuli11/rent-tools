import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email" };

/**
 * After asking for a reset link. The same words whether or not the email
 * has an account, so this page never shows who uses PropDesk.
 */
export default function ResetPasswordSentPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-base text-muted-foreground">
          If that email has a PropDesk account, we have sent it a link to choose
          a new password. The link works once and expires after an hour.
        </p>
      </div>
      <p className="text-base text-muted-foreground">
        No email? Check your junk folder, or{" "}
        <Link
          href="/reset-password"
          className="font-medium text-foreground underline underline-offset-4"
        >
          ask for another link
        </Link>
        .
      </p>
    </section>
  );
}
