import Link from "next/link";

import { AppName } from "@/components/app-name";

/** Layout for logged-out pages (log in, sign up). */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <Link href="/" className="self-start">
        <AppName />
      </Link>
      {children}
    </main>
  );
}
