import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useColumnVisibility } from "@/features/admin/hooks/use-column-visibility";
import { useUsers } from "@/features/admin/hooks/use-users";
import { useUsersQueryState } from "@/features/admin/hooks/use-users-query-state";
import { USER_COLUMNS, USER_COLUMNS_STORAGE_KEY, hiddenSortLabel } from "@/features/admin/utils/columns";
import { resultRange } from "@/features/admin/utils/format";
import { hasActiveFilters, normalizeSearch, pageCount, pageToOffset } from "@/features/admin/utils/query-params";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const SEARCH_DEBOUNCE_MS = 300;

export function useUsersPage() {
  const router = useRouter();
  const { status: access } = useRequireRole("admin");
  const { query, setSearch, setRole, toggleSort, setLimit, setPage, resetFilters } = useUsersQueryState();
  const users = useUsers(access === "allowed" ? query : null);
  const columns = useColumnVisibility(USER_COLUMNS, USER_COLUMNS_STORAGE_KEY);

  const [searchInput, setSearchInput] = useState(query.q);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const lastSentSearch = useRef(debouncedSearch);

  // When q changes from outside the input (Back, Forward, a shared link), show it in
  // the box. A change that matches what the debounce just sent is our own, so keep
  // whatever the user has typed since.
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    if (query.q !== normalizeSearch(debouncedSearch)) setSearchInput(query.q);
  }

  // Only a new debounced value may write to the URL; reacting to setSearch changing
  // identity would re-apply a stale search after Back.
  useEffect(() => {
    if (debouncedSearch === lastSentSearch.current) return;
    lastSentSearch.current = debouncedSearch;
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  useEffect(() => {
    if (users.accessProblem === "unauthorized") router.replace("/sign-in");
  }, [users.accessProblem, router]);

  const data = users.data;
  const offset = pageToOffset(query.page, query.limit);
  const total = data?.total ?? 0;
  const filtersActive = hasActiveFilters(query);

  function clearFilters() {
    setSearchInput("");
    resetFilters();
  }

  return {
    access,
    query,
    searchInput,
    setSearchInput,
    clearSearch: () => setSearchInput(""),
    setRole,
    toggleSort,
    setLimit,
    setPage,
    clearFilters,
    filtersActive,
    rows: data?.items ?? [],
    total,
    range: resultRange(offset, data?.items.length ?? 0, total),
    pageCount: pageCount(total, query.limit),
    isPastLastPage: Boolean(data && data.items.length === 0 && total > 0),
    isLoading: users.isLoading,
    isRefreshing: users.isValidating && !users.isLoading,
    errorMessage: users.errorMessage,
    isForbidden: users.accessProblem === "forbidden",
    refresh: users.refresh,
    columns: USER_COLUMNS,
    visibleColumns: columns.visible,
    toggleColumn: columns.toggle,
    showAllColumns: columns.showAll,
    canHideColumn: columns.canHide,
    hiddenSortLabel: hiddenSortLabel(USER_COLUMNS, columns.visible, query.sort),
  };
}

export type UsersPageModel = ReturnType<typeof useUsersPage>;
