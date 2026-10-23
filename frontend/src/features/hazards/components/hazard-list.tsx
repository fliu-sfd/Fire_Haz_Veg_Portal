"use client";

import { useEffect, useId, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { HazardListItem } from "@/features/hazards/components/hazard-list-item";
import type { Hazard, HazardSort } from "@/features/hazards/types";
import { SORT_OPTIONS } from "@/features/hazards/utils/list";

type HazardListProps = {
  rows: Hazard[];
  total: number;
  remaining: number;
  sort: HazardSort;
  selectedAssetId: string | null;
  isFirstLoad: boolean;
  isEmpty: boolean;
  onSortChange: (sort: HazardSort) => void;
  onSelect: (assetId: string) => void;
  onShowMore: () => void;
};

export function HazardList({
  rows,
  total,
  remaining,
  sort,
  selectedAssetId,
  isFirstLoad,
  isEmpty,
  onSortChange,
  onSelect,
  onShowMore,
}: HazardListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const sortLabelId = useId();

  // Keeps a hazard picked on the map in view; "nearest" leaves a row that is already visible alone.
  useEffect(() => {
    if (!selectedAssetId) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-asset-id="${CSS.escape(selectedAssetId)}"]`);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedAssetId, rows]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-city-light px-4 py-2.5">
        <h2 className="text-sm font-semibold text-charcoal">
          Hazards <span className="font-normal text-muted-foreground tabular-nums">({total.toLocaleString("en-US")})</span>
        </h2>
        <span id={sortLabelId} className="sr-only">
          Sort hazards
        </span>
        <Select value={sort} onValueChange={(value) => onSortChange(value as HazardSort)}>
          <SelectTrigger aria-labelledby={sortLabelId} size="sm" className="h-9 w-auto max-w-48 bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isFirstLoad ? (
          <ul aria-hidden="true" className="divide-y divide-city-light">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="space-y-2 px-4 py-3">
                <Skeleton className="h-4 w-24 bg-city-light motion-reduce:animate-none" />
                <Skeleton className="h-3 w-44 bg-city-light motion-reduce:animate-none" />
                <Skeleton className="h-3 w-56 bg-city-light motion-reduce:animate-none" />
              </li>
            ))}
          </ul>
        ) : isEmpty ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hazards to list. The message on the map explains why.</p>
        ) : (
          <>
            <ul ref={listRef} aria-label="Hazards" className="divide-y divide-city-light">
              {rows.map((hazard) => (
                <HazardListItem
                  key={hazard.assetId}
                  hazard={hazard}
                  isSelected={hazard.assetId === selectedAssetId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
            {remaining > 0 ? (
              <div className="border-t border-city-light p-3">
                <button
                  type="button"
                  onClick={onShowMore}
                  className="h-10 w-full rounded-md border border-input bg-white text-sm font-semibold text-civic-blue hover:bg-accent"
                >
                  Show more ({remaining.toLocaleString("en-US")} left)
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
