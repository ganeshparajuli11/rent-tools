import type { Metadata } from "next";
import Link from "next/link";

import { ResetRequestForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Reset your password" };

/** "Forgot your password?": ask for a reset link by email. */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { error } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-base text-muted-foreground">
          Enter the email you sign in with. We will send you a link to choose a
          new password.
        </p>
      </div>
      {error === "link" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          That reset link has expired or was already used. Ask for a new one
          below.
        </p>
      ) : null}
      <ResetRequestForm />
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </section>
  );
}
