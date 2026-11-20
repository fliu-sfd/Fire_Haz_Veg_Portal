import { useMemo, useState } from "react";
import type { Hazard, HazardSort } from "@/features/hazards/types";
import { LIST_PAGE_SIZE, sortHazards, windowSize } from "@/features/hazards/utils/list";

/** Sorted rows in a growing window. `resetKey` changes with filters or sort and shrinks the window back. */
export function useHazardList(hazards: readonly Hazard[], sort: HazardSort, selectedAssetId: string | null, resetKey: string) {
  const sorted = useMemo(() => sortHazards(hazards, sort), [hazards, sort]);
  const [requested, setRequested] = useState(LIST_PAGE_SIZE);
  const [windowKey, setWindowKey] = useState(resetKey);
  if (resetKey !== windowKey) {
    setWindowKey(resetKey);
    setRequested(LIST_PAGE_SIZE);
  }

  const selectedIndex = selectedAssetId ? sorted.findIndex((hazard) => hazard.assetId === selectedAssetId) : -1;
  const count = windowSize(sorted.length, requested, selectedIndex);

  return {
    rows: useMemo(() => sorted.slice(0, count), [sorted, count]),
    remaining: sorted.length - count,
    showMore: () => setRequested(count + LIST_PAGE_SIZE),
  };
}
