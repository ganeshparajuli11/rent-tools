import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in with a code" };

/** The second way in: a code (and link) sent by email, no password. */
export default function SignInWithCodePage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in with a code</h1>
        <p className="text-base text-muted-foreground">
          Enter your email. We will send you a code to sign in, no password
          needed. New here? This also creates your account.
        </p>
      </div>
      <SignInForm />
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4"
      >
        Sign in with a password instead
      </Link>
    </section>
  );
}
