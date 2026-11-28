import { AppName } from "@/components/app-name";

/**
 * Layout for setting up an organisation: signed in, but before the app
 * shell, because the shell needs an organisation to show.
 */
export default function SetupLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10">
      <span className="self-start">
        <AppName />
      </span>
      {children}
    </main>
  );
}
