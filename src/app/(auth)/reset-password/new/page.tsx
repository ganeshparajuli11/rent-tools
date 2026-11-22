import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NewPasswordForm } from "@/components/auth/password-forms";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Where the reset link lands (through /auth/confirm, which signs the person
 * in for this step). Without that session there is nothing to change, so
 * they are sent back to ask for a new link.
 */
export default async function NewPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/reset-password?error=link");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="text-base text-muted-foreground">
          You will use it the next time you sign in.
        </p>
      </div>
      <NewPasswordForm />
    </section>
  );
}
