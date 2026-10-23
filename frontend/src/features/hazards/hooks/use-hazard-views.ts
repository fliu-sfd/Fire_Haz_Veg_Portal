import { useCallback, useMemo } from "react";
import type { HazardSort, HazardsQuery } from "@/features/hazards/types";
import {
  canSaveView,
  MAX_VIEWS,
  parseStoredViews,
  removeView,
  toSavedView,
  upsertView,
  VIEWS_STORAGE_KEY,
  type StoredView,
} from "@/features/hazards/utils/views";
import { useLocalStorage } from "@/hooks/use-local-storage";

const NO_VIEWS: StoredView[] = [];

/** Saved filter sets in this browser only. The first render is always empty, matching the server. */
export function useHazardViews() {
  const [stored, setStored] = useLocalStorage<StoredView[]>(VIEWS_STORAGE_KEY, NO_VIEWS, parseStoredViews);
  const views = useMemo(() => stored.map(toSavedView), [stored]);

  const save = useCallback(
    (name: string, query: HazardsQuery, sort: HazardSort) =>
      setStored((current) => upsertView(current, name, query, sort)),
    [setStored],
  );
  const remove = useCallback((name: string) => setStored((current) => removeView(current, name)), [setStored]);
  const canSave = useCallback((name: string) => canSaveView(stored, name), [stored]);

  return { views, save, remove, canSave, isFull: stored.length >= MAX_VIEWS };
}
