import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useColumnVisibility } from "@/features/admin/hooks/use-column-visibility";
import { useUsers } from "@/features/admin/hooks/use-users";
import { useUsersQueryState } from "@/features/admin/hooks/use-users-query-state";
import { USER_COLUMNS, USER_COLUMNS_STORAGE_KEY, hiddenSortLabel } from "@/features/admin/utils/columns";
import { resultRange } from "@/features/admin/utils/format";
import { hasActiveFilters, normalizeSearch, pageCount, pageToOffset } from "@/features/admin/utils/query-params";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useUrlSearchInput } from "@/hooks/use-url-search-input";

export function useUsersPage() {
  const router = useRouter();
  const { status: access } = useRequireRole("admin");
  const { query, setSearch, setRole, setStatus, toggleSort, setLimit, setPage, resetFilters } = useUsersQueryState();
  const users = useUsers(access === "allowed" ? query : null);
  const columns = useColumnVisibility(USER_COLUMNS, USER_COLUMNS_STORAGE_KEY);

  const search = useUrlSearchInput(query.q, setSearch, normalizeSearch);

  useEffect(() => {
    if (users.accessProblem === "unauthorized") router.replace("/sign-in");
  }, [users.accessProblem, router]);

  const data = users.data;
  const offset = pageToOffset(query.page, query.limit);
  const total = data?.total ?? 0;
  const filtersActive = hasActiveFilters(query);

  function clearFilters() {
    search.clear();
    resetFilters();
  }

  return {
    access,
    query,
    searchInput: search.input,
    setSearchInput: search.setInput,
    clearSearch: search.clear,
    setRole,
    setStatus,
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
