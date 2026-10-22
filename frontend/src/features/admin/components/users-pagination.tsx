"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";

type UsersPaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizes: readonly number[];
  range: { from: number; to: number; total: number };
  hiddenSortLabel: string | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function UsersPagination({
  page,
  pageCount,
  pageSize,
  pageSizes,
  range,
  hiddenSortLabel,
  onPageChange,
  onPageSizeChange,
}: UsersPaginationProps) {
  const sizeLabelId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-city-light px-4 py-3 text-sm text-city-dark">
      <div className="space-y-0.5">
        <p aria-live="polite" aria-atomic="true">
          {range.total === 0 ? "No users" : `Showing ${range.from}-${range.to} of ${range.total}`}
        </p>
        {hiddenSortLabel ? (
          <p className="text-xs text-muted-foreground">Sorted by {hiddenSortLabel} (hidden column)</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span id={sizeLabelId}>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger aria-labelledby={sizeLabelId} size="sm" className="w-20 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span>
          Page {Math.min(page, pageCount)} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.min(page - 1, pageCount))}
            className={`${toolbarButtonClass} h-8 px-2`}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className={`${toolbarButtonClass} h-8 px-2`}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
