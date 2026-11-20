import type { Hazard, HazardSort } from "@/features/hazards/types";

/** Rows rendered per step; the list grows by this much on "Show more" instead of virtualizing. */
export const LIST_PAGE_SIZE = 50;

export const SORT_OPTIONS: readonly { id: HazardSort; label: string }[] = [
  { id: "oldest", label: "Oldest inspection first" },
  { id: "newest", label: "Newest first" },
  { id: "asset", label: "Asset ID" },
  { id: "crew", label: "Station/Shift" },
];

const text = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

function byAsset(a: Hazard, b: Hazard): number {
  return text.compare(a.assetId, b.assetId);
}

/** Missing values sort last in both directions, so unknown dates never lead the list. */
function compareNullable<T>(a: T | null, b: T | null, compare: (a: T, b: T) => number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return compare(a, b);
}

const COMPARATORS: Record<HazardSort, (a: Hazard, b: Hazard) => number> = {
  oldest: (a, b) => compareNullable(a.inspectedAt, b.inspectedAt, (x, y) => Date.parse(x) - Date.parse(y)),
  newest: (a, b) => compareNullable(a.inspectedAt, b.inspectedAt, (x, y) => Date.parse(y) - Date.parse(x)),
  asset: () => 0,
  crew: (a, b) => compareNullable(a.crewCode, b.crewCode, (x, y) => text.compare(x, y)),
};

/** A new, stably sorted array; asset ID breaks every tie so the order never jumps between renders. */
export function sortHazards(hazards: readonly Hazard[], sort: HazardSort): Hazard[] {
  const compare = COMPARATORS[sort];
  return [...hazards].sort((a, b) => compare(a, b) || byAsset(a, b));
}

/** How many rows to render: at least the requested window, and far enough to include the selection. */
export function windowSize(total: number, requested: number, selectedIndex: number): number {
  const needed = selectedIndex >= 0 ? Math.ceil((selectedIndex + 1) / LIST_PAGE_SIZE) * LIST_PAGE_SIZE : 0;
  return Math.min(total, Math.max(requested, needed));
}
