import {
  Building2Icon,
  ChartColumnIcon,
  FileTextIcon,
  HardHatIcon,
  LayoutGridIcon,
  type LucideIcon,
  PoundSterlingIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

import type { NavIcon as NavIconName } from "@/lib/nav";

const ICONS: Record<NavIconName, LucideIcon> = {
  today: LayoutGridIcon,
  properties: Building2Icon,
  owners: UserIcon,
  tenants: UsersIcon,
  tenancies: FileTextIcon,
  rent: PoundSterlingIcon,
  reports: ChartColumnIcon,
  repairs: WrenchIcon,
  contractors: HardHatIcon,
  settings: SettingsIcon,
};

/** The 18px stroke icon for a menu item. Decorative: the label says it all. */
export function NavIcon({
  name,
  className,
}: {
  name: NavIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.8}
      className={className ?? "size-4.5"}
    />
  );
}
