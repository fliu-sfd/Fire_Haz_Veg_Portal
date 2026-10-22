import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { navGroupsFor, type ResolvedNavGroup } from "@/components/layout/nav";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import type { Account } from "@/features/auth/api";

export function useNavItems(account: Account | undefined): ResolvedNavGroup<LucideIcon>[] {
  const role = account?.role;
  return useMemo(() => (role ? navGroupsFor(NAV_GROUPS, role) : []), [role]);
}
