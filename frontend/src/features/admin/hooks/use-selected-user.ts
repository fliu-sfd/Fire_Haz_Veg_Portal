import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { readSelectedUser, withSelectedUser } from "@/features/admin/utils/query-params";

/** The `?user=` param. Opening or closing the panel keeps the list's search, filters and page. */
export function useSelectedUser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedUserId = readSelectedUser(searchParams);

  const setSelectedUserId = useCallback(
    (id: string | null) => {
      const search = withSelectedUser(new URLSearchParams(searchParams.toString()), id);
      // Replaced, not pushed, so Back leaves the page instead of reopening closed panels.
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { selectedUserId, setSelectedUserId };
}
