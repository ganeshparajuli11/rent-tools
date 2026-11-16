import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder: rent in, rent owed to owners and overdue tenants come later.
export default async function DashboardPage() {
  const user = await requireUser();

  // Read through the user's own session (publishable key), so RLS decides
  // which membership and organisation rows come back.
  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role, organisations ( name )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[dashboard] membership query failed", { code: error.code });
  }

  const organisationName = membership?.organisations?.name;

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {organisationName ?? "Your organisation"}
          </CardTitle>
          <CardDescription className="text-base break-all">
            Signed in as {user.email ?? "unknown email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-base text-muted-foreground">
          {error || !organisationName
            ? "We could not load your organisation. Please refresh the page."
            : "Your rent summary will show here."}
        </CardContent>
      </Card>
    </section>
  );
}
