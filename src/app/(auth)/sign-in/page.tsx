import type { Metadata } from "next";
import Link from "next/link";

import { PasswordSignInForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Sign in" };

const linkClass =
  "inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4";

/**
 * Sign in with an email and password (roadmap B1, decision D-12). "Email
 * me a sign-in code" stays as a second way in, for people who prefer it.
 */
export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { error } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Welcome back. Sign in with your email and password.
        </p>
      </div>
      {error === "link" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          That link has expired or was already used. Sign in below, or ask for a
          new link.
        </p>
      ) : null}
      <PasswordSignInForm />
      <div className="flex flex-col items-start gap-1">
        <Link href="/reset-password" className={linkClass}>
          Forgot your password?
        </Link>
        <Link href="/sign-in/code" className={linkClass}>
          Email me a sign-in code instead
        </Link>
      </div>
      <p className="border-t pt-6 text-base text-muted-foreground">
        New to PropDesk?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
