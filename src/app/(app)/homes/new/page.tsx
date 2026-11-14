import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomeWizard } from "@/components/homes/home-wizard";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Add a home" };

export default async function NewHomePage() {
  await requireUser();
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href="/homes"
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Cancel
      </Link>
      <h1 className="text-2xl font-semibold">Add a home</h1>
      <HomeWizard />
    </div>
  );
}
