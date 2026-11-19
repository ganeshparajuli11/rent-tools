import { DownloadIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExportKind } from "@/lib/validation/data-rights";

const DOWNLOADS: { kind: ExportKind; label: string; hint: string }[] = [
  {
    kind: "homes",
    label: "Download homes",
    hint: "Each home, its rooms and its owner.",
  },
  {
    kind: "tenants",
    label: "Download tenants",
    hint: "Every tenant, now and in the past, with their rent.",
  },
  {
    kind: "payments",
    label: "Download payments",
    hint: "Every rent payment you have marked.",
  },
];

export const EXPORT_PROBLEMS: Record<string, string> = {
  "too-many":
    "You have downloaded a lot in a short time. Please wait 10 minutes and try again.",
  "owners-only": "Only the account owner can download data.",
  "too-big":
    "There is too much to download in one file. Please contact us for a copy.",
  failed: "Sorry, we could not make that file just now. Please try again.",
};

/**
 * "Download your data": three plain links, one per file. Each one is a
 * normal download (GET /api/export), so it works without JavaScript and on
 * every phone. Shown to owners only.
 */
export function DataDownloads({ problem }: { problem?: string }) {
  // Only our own messages: the address can say anything.
  const message =
    problem && Object.hasOwn(EXPORT_PROBLEMS, problem)
      ? EXPORT_PROBLEMS[problem]
      : undefined;

  return (
    <section
      aria-labelledby="downloads-heading"
      className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="downloads-heading" className="text-xl font-semibold">
          Download your data
        </h2>
        <p className="text-base text-muted-foreground">
          Spreadsheet files (CSV) you can open in Excel, Numbers or Google
          Sheets. They include tenants&apos; names and contact details, so keep
          them safe.
        </p>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 p-3 text-base"
        >
          {message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {DOWNLOADS.map((download) => (
          <li
            key={download.kind}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <a
              href={`/api/export?data=${download.kind}`}
              download
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 w-full gap-2 px-6 text-base sm:w-60",
              )}
            >
              <DownloadIcon aria-hidden="true" className="size-5" />
              {download.label}
            </a>
            <span className="text-base text-muted-foreground">
              {download.hint}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
