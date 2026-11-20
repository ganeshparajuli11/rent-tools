import "server-only";

import { type Ctx, getOrganisationId } from "./context";

/**
 * The ⌘K search: homes and tenants whose names (and, for homes, first
 * address line or postcode) contain the term. Two queries, run together,
 * with the user's own client (RLS applies) and filtered by the organisation
 * looked up on the server. Owners, contractors and repairs join in D3.
 *
 * Read-only, so no audit_log row: a search term is often a person's name,
 * and the audit log never holds names.
 *
 * `term` must come from `searchQuerySchema`, which removes every character
 * that could change a PostgREST filter (commas, brackets, quotes, % and _).
 */

export const SEARCH_RESULT_LIMIT = 6;

export type SearchResult = {
  kind: "home" | "tenant";
  id: string;
  href: string;
  title: string;
  detail: string;
};

export type SearchResults = {
  homes: SearchResult[];
  tenants: SearchResult[];
};

export async function searchRecords(
  ctx: Ctx,
  term: string,
): Promise<SearchResults> {
  const organisationId = await getOrganisationId(ctx);
  const pattern = `%${term}%`;
  // Double quotes keep spaces and dots inside one value.
  const homeFilter = ["name", "address_line1", "postcode"]
    .map((column) => `${column}.ilike."${pattern}"`)
    .join(",");

  const [homes, tenants] = await Promise.all([
    ctx.supabase
      .from("properties")
      .select("id, name, address_line1, postcode, archived_at")
      .eq("organisation_id", organisationId)
      .or(homeFilter)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .limit(SEARCH_RESULT_LIMIT),
    ctx.supabase
      .from("tenancies")
      .select("id, tenant_name, end_date, properties(name), rooms(name)")
      .eq("organisation_id", organisationId)
      .ilike("tenant_name", pattern)
      .order("end_date", { ascending: false, nullsFirst: true })
      .order("tenant_name", { ascending: true })
      .order("id", { ascending: true })
      .limit(SEARCH_RESULT_LIMIT),
  ]);
  if (homes.error) throw homes.error;
  if (tenants.error) throw tenants.error;

  return {
    homes: homes.data.map((home) => ({
      kind: "home",
      id: home.id,
      href: `/homes/${home.id}`,
      title: home.name,
      detail: homeDetail(home),
    })),
    tenants: tenants.data.map((tenancy) => ({
      kind: "tenant",
      id: tenancy.id,
      href: `/tenants/${tenancy.id}`,
      title: tenancy.tenant_name,
      detail: tenantDetail(tenancy),
    })),
  };
}

function homeDetail(home: {
  address_line1: string | null;
  postcode: string | null;
  archived_at: string | null;
}): string {
  const parts = [home.address_line1, home.postcode].filter(Boolean);
  if (home.archived_at) parts.push("Archived");
  return parts.join(" · ");
}

function tenantDetail(tenancy: {
  end_date: string | null;
  properties: { name: string } | null;
  rooms: { name: string } | null;
}): string {
  const place = [tenancy.properties?.name, tenancy.rooms?.name]
    .filter(Boolean)
    .join(", ");
  return tenancy.end_date === null ? place : `${place} · Moved out`;
}
