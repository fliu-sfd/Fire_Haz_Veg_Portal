import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { navGroupsFor, type ResolvedNavGroup } from "@/components/layout/nav";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import type { Account } from "@/features/auth/api";
import { useReviewInboxCount } from "@/features/reviews/hooks/use-review-inbox";

export function useNavItems(account: Account | undefined): ResolvedNavGroup<LucideIcon>[] {
  const role = account?.role;
  const pending = useReviewInboxCount();
  return useMemo(() => role ? navGroupsFor(NAV_GROUPS, role).map((group) => ({
    ...group, items: group.items.map((item) => item.href === "/dashboard/reviews" ? { ...item, badge: pending } : item),
  })) : [], [role, pending]);
}
