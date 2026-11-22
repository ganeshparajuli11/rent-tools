import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirm your email" };

/** After sign-up, when the project asks people to confirm their email. */
export default function SignUpCheckEmailPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Confirm your email</h1>
        <p className="text-base text-muted-foreground">
          We have sent you an email with a link. Open it on this device to
          confirm your address, and you will be signed in.
        </p>
      </div>
      <p className="text-base text-muted-foreground">
        No email after a few minutes? Check your junk folder. If you already
        have an account, you can{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline underline-offset-4"
        >
          sign in
        </Link>{" "}
        instead.
      </p>
    </section>
  );
}
