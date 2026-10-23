"use client";

import { ColumnVisibilityMenu } from "@/features/admin/components/column-visibility-menu";
import { UsersPagination } from "@/features/admin/components/users-pagination";
import {
  AdminAccessRequired,
  NoMatchingUsers,
  NoUsers,
  PastLastPage,
  UsersError,
} from "@/features/admin/components/users-states";
import { UsersTable } from "@/features/admin/components/users-table";
import { UsersToolbar } from "@/features/admin/components/users-toolbar";
import { useUsersPage } from "@/features/admin/hooks/use-users-page";
import { PAGE_SIZES, SEARCH_MAX_LENGTH } from "@/features/admin/utils/query-params";

export function UsersView() {
  const page = useUsersPage();

  // Render nothing admin-specific until the role check passes, so a redirect never flashes the list.
  if (page.access !== "allowed") {
    return <p role="status" className="text-city-dark">Checking access…</p>;
  }

  const emptyState = page.isPastLastPage ? (
    <PastLastPage onFirstPage={() => page.setPage(1)} />
  ) : page.filtersActive ? (
    <NoMatchingUsers onClearFilters={page.clearFilters} />
  ) : (
    <NoUsers />
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">Users</h1>
        <p className="mt-2 text-city-dark">Search residents and staff, and review their roles and linked asset IDs.</p>
      </header>

      <section
        aria-label="User list"
        className="overflow-hidden rounded-lg border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.08)]"
      >
        {page.isForbidden ? (
          <AdminAccessRequired />
        ) : (
          <>
            <UsersToolbar
              search={page.searchInput}
              searchMaxLength={SEARCH_MAX_LENGTH}
              role={page.query.role}
              filtersActive={page.filtersActive}
              isRefreshing={page.isRefreshing}
              onSearchChange={page.setSearchInput}
              onSearchClear={page.clearSearch}
              onRoleChange={page.setRole}
              onClearFilters={page.clearFilters}
              onRefresh={page.refresh}
              columnsMenu={
                <ColumnVisibilityMenu
                  columns={page.columns}
                  visible={page.visibleColumns}
                  canHide={page.canHideColumn}
                  onToggle={page.toggleColumn}
                  onShowAll={page.showAllColumns}
                />
              }
            />
            {page.errorMessage ? (
              <UsersError message={page.errorMessage} isRetrying={page.isRefreshing} onRetry={page.refresh} />
            ) : (
              <>
                <UsersTable
                  columns={page.columns}
                  visibleColumns={page.visibleColumns}
                  rows={page.rows}
                  sort={page.query.sort}
                  order={page.query.order}
                  onSortChange={page.toggleSort}
                  isLoading={page.isLoading}
                  isRefreshing={page.isRefreshing}
                  skeletonRows={Math.min(page.query.limit, 8)}
                  emptyState={emptyState}
                />
                <UsersPagination
                  page={page.query.page}
                  pageCount={page.pageCount}
                  pageSize={page.query.limit}
                  pageSizes={PAGE_SIZES}
                  range={page.range}
                  hiddenSortLabel={page.hiddenSortLabel}
                  onPageChange={page.setPage}
                  onPageSizeChange={page.setLimit}
                />
              </>
            )}
          </>
        )}
      </section>
      <p role="status" className="sr-only">
        {page.isLoading || page.isRefreshing ? "Loading users…" : ""}
      </p>
    </div>
  );
}
