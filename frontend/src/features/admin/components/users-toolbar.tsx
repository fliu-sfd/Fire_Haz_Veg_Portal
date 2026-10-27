"use client";

import { RefreshCw, Search, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusFilter } from "@/features/admin/components/status-filter";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";
import type { UserRole } from "@/features/auth/api";
import { cn } from "@/lib/utils";

const ALL_ROLES = "all";

const ROLE_OPTIONS: { value: UserRole | typeof ALL_ROLES; label: string }[] = [
  { value: ALL_ROLES, label: "All roles" },
  { value: "resident", label: "Resident" },
  { value: "firefighter", label: "Firefighter" },
  { value: "admin", label: "Admin" },
];

type UsersToolbarProps = {
  search: string;
  searchMaxLength: number;
  role: UserRole | null;
  isActive: boolean | null;
  filtersActive: boolean;
  isRefreshing: boolean;
  columnsMenu: ReactNode;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onRoleChange: (role: UserRole | null) => void;
  onStatusChange: (isActive: boolean | null) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
};

export function UsersToolbar({
  search,
  searchMaxLength,
  role,
  isActive,
  filtersActive,
  isRefreshing,
  columnsMenu,
  onSearchChange,
  onSearchClear,
  onRoleChange,
  onStatusChange,
  onClearFilters,
  onRefresh,
}: UsersToolbarProps) {
  const searchId = useId();
  const roleLabelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-city-light p-3 sm:p-4">
      <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
        <label htmlFor={searchId} className="sr-only">
          Search users
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={searchId}
          type="search"
          value={search}
          maxLength={searchMaxLength}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, email, or asset ID"
          autoComplete="off"
          className="h-10 bg-white pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            onClick={onSearchClear}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-deep-blue"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <span id={roleLabelId} className="sr-only">
        Filter by role
      </span>
      <Select value={role ?? ALL_ROLES} onValueChange={(value) => onRoleChange(value === ALL_ROLES ? null : (value as UserRole))}>
        <SelectTrigger aria-labelledby={roleLabelId} className="h-10! w-40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <StatusFilter value={isActive} onChange={onStatusChange} />

      {filtersActive ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-civic-blue hover:bg-accent"
        >
          <X aria-hidden="true" className="size-4" />
          Clear filters
        </button>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh users" className={toolbarButtonClass}>
          <RefreshCw aria-hidden="true" className={cn("size-4", isRefreshing && "animate-spin")} />
        </button>
        {columnsMenu}
      </div>
    </div>
  );
}
