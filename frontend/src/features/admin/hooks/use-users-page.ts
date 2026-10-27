import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useColumnVisibility } from "@/features/admin/hooks/use-column-visibility";
import { useSelectedUser } from "@/features/admin/hooks/use-selected-user";
import { useUserActions } from "@/features/admin/hooks/use-user-actions";
import { useUserDetail } from "@/features/admin/hooks/use-user-detail";
import { useUserEditForm } from "@/features/admin/hooks/use-user-edit-form";
import { useUsers } from "@/features/admin/hooks/use-users";
import { useUsersQueryState } from "@/features/admin/hooks/use-users-query-state";
import { USER_COLUMNS, USER_COLUMNS_STORAGE_KEY, hiddenSortLabel } from "@/features/admin/utils/columns";
import { resultRange } from "@/features/admin/utils/format";
import { hasActiveFilters, normalizeSearch, pageCount, pageToOffset } from "@/features/admin/utils/query-params";
import { discardConfirmation } from "@/features/admin/utils/user-form";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useUrlSearchInput } from "@/hooks/use-url-search-input";

export function useUsersPage() {
  const router = useRouter();
  const { status: access } = useRequireRole("admin");
  const { query, setSearch, setRole, setStatus, toggleSort, setLimit, setPage, resetFilters } = useUsersQueryState();
  const users = useUsers(access === "allowed" ? query : null);
  const columns = useColumnVisibility(USER_COLUMNS, USER_COLUMNS_STORAGE_KEY);

  const search = useUrlSearchInput(query.q, setSearch, normalizeSearch);
  const editPanel = useEditPanel(access === "allowed");

  const unauthorized = users.accessProblem === "unauthorized" || editPanel.accessProblem === "unauthorized";
  useEffect(() => {
    if (unauthorized) router.replace("/sign-in");
  }, [unauthorized, router]);

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
    isForbidden: users.accessProblem === "forbidden" || editPanel.accessProblem === "forbidden",
    refresh: users.refresh,
    columns: USER_COLUMNS,
    visibleColumns: columns.visible,
    toggleColumn: columns.toggle,
    showAllColumns: columns.showAll,
    canHideColumn: columns.canHide,
    hiddenSortLabel: hiddenSortLabel(USER_COLUMNS, columns.visible, query.sort),
    selectedUserId: editPanel.selectedUserId,
    openUser: editPanel.openUser,
    editPanel,
  };
}

/** The edit panel opened from a row. Its user id lives in the URL as `?user=`. */
function useEditPanel(enabled: boolean) {
  const { account } = useCurrentAccount();
  const { selectedUserId, setSelectedUserId } = useSelectedUser();
  const userId = enabled ? selectedUserId : null;
  const detail = useUserDetail(userId);
  const actions = useUserActions(userId);
  const form = useUserEditForm(detail.user, actions.save);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const openUser = useCallback(
    (id: string, trigger?: HTMLElement) => {
      returnFocusTo.current = trigger ?? null;
      setSelectedUserId(id);
    },
    [setSelectedUserId],
  );

  function close() {
    form.reset();
    setIsDiscarding(false);
    setSelectedUserId(null);
  }

  function requestClose() {
    if (form.isDirty) setIsDiscarding(true);
    else close();
  }

  function onCloseAutoFocus(event: Event) {
    // Opened from a shared link there is no row to go back to; the dialog's default applies.
    if (returnFocusTo.current?.isConnected) {
      event.preventDefault();
      returnFocusTo.current.focus();
    }
  }

  return {
    open: userId !== null,
    selectedUserId: userId,
    user: detail.user,
    isLoading: detail.isLoading,
    loadError: detail.accessProblem ? undefined : detail.errorMessage,
    accessProblem: detail.accessProblem,
    isRetrying: detail.isRetrying,
    retry: detail.retry,
    isSelf: Boolean(account && userId && account.id === userId),
    form,
    actions,
    discardConfirmation: isDiscarding && detail.user ? discardConfirmation(detail.user.fullName) : null,
    openUser,
    requestClose,
    discard: close,
    keepEditing: () => setIsDiscarding(false),
    onCloseAutoFocus,
  };
}

export type EditPanelModel = ReturnType<typeof useEditPanel>;

export type UsersPageModel = ReturnType<typeof useUsersPage>;
