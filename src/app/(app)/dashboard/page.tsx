import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder: rent in, rent owed to owners and overdue tenants come later.
export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Your rent summary will show here.</p>
    </section>
  );
}
