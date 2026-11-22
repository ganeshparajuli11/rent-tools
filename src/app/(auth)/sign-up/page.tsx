import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Create an account" };

/** Create an account with an email and password (roadmap B1). */
export default function SignUpPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="text-base text-muted-foreground">
          Your homes, tenants and rent in one place. It takes a minute.
        </p>
      </div>
      <SignUpForm />
      <p className="border-t pt-6 text-base text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
