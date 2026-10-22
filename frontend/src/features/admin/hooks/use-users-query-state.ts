import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { UserSortField, UsersQuery } from "@/features/admin/types";
import {
  DEFAULT_USERS_QUERY,
  nextSort,
  normalizeSearch,
  parseUsersQuery,
  usersQueryToSearchParams,
} from "@/features/admin/utils/query-params";
import type { UserRole } from "@/features/auth/api";

/** Users list state kept in the URL so views are shareable and survive back/forward. */
export function useUsersQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseUsersQuery(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: UsersQuery, mode: "push" | "replace") => {
      const search = usersQueryToSearchParams(next).toString();
      const href = search ? `${pathname}?${search}` : pathname;
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  // Every change except paging returns to page 1, so results never start mid-list.
  const update = useCallback(
    (changes: Partial<UsersQuery>, mode: "push" | "replace" = "push") => {
      navigate({ ...query, page: 1, ...changes }, mode);
    },
    [navigate, query],
  );

  const setSearch = useCallback(
    (value: string) => {
      const q = normalizeSearch(value);
      // Typing is replaced, not pushed, so Back does not step through every keystroke.
      if (q !== query.q) update({ q }, "replace");
    },
    [query.q, update],
  );

  const setRole = useCallback((role: UserRole | null) => update({ role }), [update]);
  const toggleSort = useCallback((field: UserSortField) => update(nextSort(query, field)), [query, update]);
  const setLimit = useCallback((limit: number) => update({ limit }), [update]);
  const setPage = useCallback((page: number) => update({ page }), [update]);
  const resetFilters = useCallback(() => update({ q: DEFAULT_USERS_QUERY.q, role: DEFAULT_USERS_QUERY.role }), [update]);

  return { query, setSearch, setRole, toggleSort, setLimit, setPage, resetFilters };
}
