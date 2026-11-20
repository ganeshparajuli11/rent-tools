/**
 * The signed-in app's menu (docs/DESIGN_SYSTEM.md §2), in one place for the
 * sidebar, the phone bottom bar and its More sheet.
 *
 * Items for pages that do not exist yet are listed with `ready: false` and
 * are left out of every menu, so nothing links to a missing page. Flip an
 * item to `ready: true` in the roadmap item that builds its page.
 */

export type NavIcon =
  | "today"
  | "properties"
  | "owners"
  | "tenants"
  | "tenancies"
  | "rent"
  | "reports"
  | "repairs"
  | "contractors"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  ready: boolean;
  /** Shown in the phone bottom bar (the rest go under More). */
  bottomBar?: boolean;
};

export type NavGroup = {
  /** Uppercase eyebrow above the group; empty for the first group. */
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "",
    items: [
      {
        href: "/dashboard",
        label: "Today",
        icon: "today",
        ready: true,
        bottomBar: true,
      },
    ],
  },
  {
    label: "Portfolio",
    items: [
      {
        href: "/homes",
        label: "Properties",
        icon: "properties",
        ready: true,
        bottomBar: true,
      },
      { href: "/owners", label: "Owners", icon: "owners", ready: false },
      { href: "/tenants", label: "Tenants", icon: "tenants", ready: false },
      {
        href: "/tenancies",
        label: "Tenancies",
        icon: "tenancies",
        ready: false,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        href: "/rent",
        label: "Rent",
        icon: "rent",
        ready: true,
        bottomBar: true,
      },
      { href: "/reports", label: "Reports", icon: "reports", ready: false },
    ],
  },
  {
    label: "Work",
    items: [
      {
        href: "/repairs",
        label: "Repairs",
        icon: "repairs",
        ready: false,
        bottomBar: true,
      },
      {
        href: "/contractors",
        label: "Contractors",
        icon: "contractors",
        ready: false,
      },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: "settings", ready: true },
    ],
  },
];

/** The groups as shown: only ready items, and no empty groups. */
export function visibleNavGroups(
  groups: readonly NavGroup[] = NAV_GROUPS,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.ready),
    }))
    .filter((group) => group.items.length > 0);
}

/** The phone bottom bar's links (More is added by the bar itself). */
export function bottomBarItems(
  groups: readonly NavGroup[] = NAV_GROUPS,
): NavItem[] {
  return visibleNavGroups(groups)
    .flatMap((group) => group.items)
    .filter((item) => item.bottomBar);
}

/** Everything else, for the More sheet on phones. */
export function moreItems(groups: readonly NavGroup[] = NAV_GROUPS): NavItem[] {
  return visibleNavGroups(groups)
    .flatMap((group) => group.items)
    .filter((item) => !item.bottomBar);
}

/** True when `pathname` is the item's page or a page inside it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
