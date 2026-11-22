import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ResendCodeForm,
  VerifyCodeForm,
} from "@/components/auth/verify-code-form";
import { getPendingSignInEmail } from "@/server/pending-sign-in";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage() {
  const email = await getPendingSignInEmail();
  if (!email) redirect("/sign-in");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-base text-muted-foreground">
          We sent a code to{" "}
          <strong className="break-all text-foreground">{email}</strong>. Type
          the code below, or tap the link in the email.
        </p>
      </div>

      <VerifyCodeForm />

      <div className="flex flex-col gap-3 border-t pt-6">
        <p className="text-base text-muted-foreground">
          No email? Check your junk folder, or:
        </p>
        <ResendCodeForm />
        <Link
          href="/sign-in/code"
          className="py-2 text-center text-base underline underline-offset-4"
        >
          Use a different email
        </Link>
      </div>
    </section>
  );
}
