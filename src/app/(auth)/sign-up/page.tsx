import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up" };

// Placeholder: the sign-up form is built in a later session.
export default function SignUpPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="text-muted-foreground">Sign up is coming soon.</p>
    </section>
  );
}
