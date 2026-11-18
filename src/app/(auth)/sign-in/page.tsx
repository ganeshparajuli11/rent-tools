import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { TestPasswordForm } from "@/components/auth/test-password-form";
import { isTestLoginEnabled } from "@/server/test-login";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { error } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Enter your email. We will send you a code to sign in. No password
          needed. New here? This also creates your account.
        </p>
      </div>
      {error === "link" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          That sign-in link has expired or was already used. Enter your email to
          get a new one.
        </p>
      ) : null}
      <SignInForm />
      {isTestLoginEnabled() ? (
        <details className="rounded-xl border p-4">
          <summary className="min-h-11 cursor-pointer content-center text-base">
            Testing: sign in with a password
          </summary>
          <div className="mt-4">
            <TestPasswordForm />
          </div>
        </details>
      ) : null}
    </section>
  );
}
