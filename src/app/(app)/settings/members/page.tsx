import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { RoleNotice } from "@/components/app/role-notice";
import { SectionCard } from "@/components/app/section-card";
import { InvitationList } from "@/components/members/invitation-list";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MemberList } from "@/components/members/member-list";
import { TransferOwnership } from "@/components/members/transfer-ownership";
import { parsePageNumber } from "@/lib/homes-sort";
import { hasRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getMembership } from "@/server/context";
import { listMembers, listOpenInvitations } from "@/server/members";
import { getOrganisationDetails } from "@/server/organisation";

export const metadata: Metadata = { title: "Members" };

const NO_NAME = "Name not added yet";

/**
 * Settings › Members (roadmap B4): who is in the organisation and their
 * roles. Owners and admins invite people, change roles, remove members and
 * cancel invitations; the owner can transfer ownership. Managers can look;
 * staff see a notice (docs/DESIGN_SYSTEM.md §8). The server and RLS check
 * every change again.
 */
export default async function MembersPage({
  searchParams,
}: PageProps<"/settings/members">) {
  const user = await requireUser();
  const params = await searchParams;
  const page = parsePageNumber(params.page);
  const ctx = { supabase: await createClient(), userId: user.id };
  const { role } = await getMembership(ctx);

  const back = (
    <Link
      href="/settings"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4.5" />
      Settings
    </Link>
  );

  if (!hasRole(role, "manager")) {
    return (
      <section className="flex max-w-3xl flex-col gap-6">
        {back}
        <PageHeader title="Members" />
        <RoleNotice
          min="manager"
          back={{ href: "/settings", label: "Back to Settings" }}
        />
      </section>
    );
  }

  const canManage = hasRole(role, "admin");
  const isOwner = role === "owner";
  const [list, invitations, organisation] = await Promise.all([
    listMembers(ctx, { page }),
    canManage ? listOpenInvitations(ctx) : Promise.resolve([]),
    getOrganisationDetails(ctx),
  ]);

  const rows = list.members.map((member) => ({
    membershipId: member.membershipId,
    name: member.name ?? NO_NAME,
    role: member.role ?? "member",
    joinedAt: member.joinedAt,
    isYou: member.userId === user.id,
    canChange:
      canManage && member.userId !== user.id && member.role !== "owner",
  }));
  const candidates = list.members
    .filter((member) => member.userId !== user.id && member.role !== "owner")
    .map((member) => ({
      membershipId: member.membershipId,
      name: member.name ?? NO_NAME,
    }));

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      {back}
      <PageHeader
        title="Members"
        count={list.total}
        countLabel={list.total === 1 ? "member" : "members"}
        description={`The people who work in ${organisation.name}.`}
      />

      <SectionCard id="members" title="People">
        {rows.length ? (
          <MemberList members={rows} />
        ) : (
          <EmptyState
            icon={<UsersIcon />}
            title="No one on this page"
            description="Go back to the first page to see everyone."
            headingLevel={3}
          />
        )}
        <Pagination
          page={list.page}
          pageCount={list.pageCount}
          previousHref={`/settings/members?page=${list.page - 1}`}
          nextHref={`/settings/members?page=${list.page + 1}`}
        />
        {!canManage ? (
          <p className="text-base text-muted-foreground">
            Only an owner or admin can invite people or change roles.
          </p>
        ) : null}
      </SectionCard>

      {canManage ? (
        <SectionCard id="invite" title="Invite someone">
          <InviteMemberForm />
        </SectionCard>
      ) : null}

      {canManage ? (
        <SectionCard id="invitations" title="Waiting to join">
          {invitations.length ? (
            <InvitationList invitations={invitations} />
          ) : (
            <p className="text-base text-muted-foreground">
              No invitations waiting. People you invite show here until they
              join.
            </p>
          )}
        </SectionCard>
      ) : null}

      {isOwner ? (
        <SectionCard id="ownership" title="Ownership">
          <TransferOwnership
            organisationName={organisation.name}
            candidates={candidates}
          />
        </SectionCard>
      ) : null}
    </section>
  );
}
