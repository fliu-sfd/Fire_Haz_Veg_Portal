"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetIdList } from "@/features/admin/components/asset-id-list";
import { RoleBadge } from "@/features/admin/components/role-badge";
import { StatusBadge } from "@/features/admin/components/status-badge";
import type { AdminUser, SortOrder, UserSortField } from "@/features/admin/types";
import type { ColumnConfig, UserColumnId } from "@/features/admin/utils/columns";
import { formatDate, formatTimestamp, initials } from "@/features/admin/utils/format";
import { cn } from "@/lib/utils";

const CELLS: Record<UserColumnId, (user: AdminUser) => ReactNode> = {
  name: (user) => (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-civic-blue"
      >
        {initials(user.fullName)}
      </span>
      <span className="font-semibold text-charcoal">{user.fullName}</span>
    </div>
  ),
  email: (user) => <span className="text-city-dark">{user.email}</span>,
  role: (user) => <RoleBadge role={user.role} />,
  status: (user) => <StatusBadge isActive={user.isActive} />,
  assetIds: (user) => <AssetIdList ids={user.assetIds} />,
  lastLoginAt: (user) =>
    user.lastLoginAt ? (
      <time dateTime={user.lastLoginAt} title={formatTimestamp(user.lastLoginAt)} className="text-city-dark">
        {formatDate(user.lastLoginAt)}
      </time>
    ) : (
      <span className="text-muted-foreground">Never</span>
    ),
  createdAt: (user) => (
    <time dateTime={user.createdAt} title={formatTimestamp(user.createdAt)} className="text-city-dark">
      {formatDate(user.createdAt)}
    </time>
  ),
};

const SKELETON_WIDTHS: Record<UserColumnId, string> = {
  name: "w-40",
  email: "w-48",
  role: "w-20",
  status: "w-16",
  assetIds: "w-28",
  lastLoginAt: "w-24",
  createdAt: "w-24",
};

type UsersTableProps = {
  columns: readonly ColumnConfig<UserColumnId>[];
  visibleColumns: readonly UserColumnId[];
  rows: AdminUser[];
  sort: UserSortField;
  order: SortOrder;
  onSortChange: (field: UserSortField) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  skeletonRows: number;
  /** Rendered across the full width when there are no rows to show. */
  emptyState?: ReactNode;
};

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-40" />;
  return order === "asc" ? (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  );
}

export function UsersTable({
  columns,
  visibleColumns,
  rows,
  sort,
  order,
  onSortChange,
  isLoading,
  isRefreshing,
  skeletonRows,
  emptyState,
}: UsersTableProps) {
  const shown = columns.filter((column) => visibleColumns.includes(column.id));

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden transition-opacity",
          isRefreshing ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="h-full w-1/3 animate-indeterminate bg-denim motion-reduce:w-full motion-reduce:animate-none" />
      </div>
      <Table aria-busy={isLoading || isRefreshing} containerClassName="max-h-[70vh] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {shown.map((column) => {
              const active = column.sortField === sort;
              return (
                <TableHead
                  key={column.id}
                  scope="col"
                  aria-sort={active ? (order === "asc" ? "ascending" : "descending") : undefined}
                  className="sticky top-0 z-10 h-11 bg-city-gray px-4 text-xs font-bold uppercase tracking-[0.08em] text-city-dark shadow-[inset_0_-1px_0_var(--color-city-light)]"
                >
                  {column.sortField ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.sortField!)}
                      className={cn(
                        "-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 uppercase hover:bg-accent hover:text-deep-blue",
                        active && "text-deep-blue",
                      )}
                    >
                      {column.label}
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody className={cn("transition-opacity", isRefreshing && "opacity-60")}>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  {shown.map((column) => (
                    <TableCell key={column.id} className="h-14 px-4">
                      <Skeleton className={cn("h-4 bg-city-light", SKELETON_WIDTHS[column.id])} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((user) => (
                <TableRow key={user.id} className={cn(!user.isActive && "bg-city-gray/60 text-muted-foreground")}>
                  {shown.map((column) => (
                    <TableCell key={column.id} className="h-14 px-4">
                      {CELLS[column.id](user)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          {!isLoading && rows.length === 0 && emptyState ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={shown.length} className="p-0 whitespace-normal">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
