import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in" };

// Placeholder: the log-in form is built in a later session.
export default function LoginPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="text-muted-foreground">Log in is coming soon.</p>
    </section>
  );
}
