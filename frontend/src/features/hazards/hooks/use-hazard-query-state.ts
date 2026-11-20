import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { HazardSort, HazardState, HazardsPageState, HazardsQuery, PropertyType } from "@/features/hazards/types";
import {
  DEFAULT_HAZARDS_QUERY,
  hazardsPageStateToSearchParams,
  normalizeDateRange,
  normalizeSearch,
  parseHazardsPageState,
  toggleCrew,
  toggleState,
} from "@/features/hazards/utils/query-params";

type NavigationMode = "push" | "replace";

/** Hazard map filters, sort and selection kept in the URL so views are shareable and survive back/forward. */
export function useHazardQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseHazardsPageState(searchParams), [searchParams]);

  // Menus stay open for several picks, and a second pick can land before the URL from
  // the first one does. Each change builds on the latest requested state, not the URL.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const navigate = useCallback(
    (change: (current: HazardsPageState) => Partial<HazardsPageState>, mode: NavigationMode) => {
      const next = { ...latest.current, ...change(latest.current) };
      latest.current = next;
      const search = hazardsPageStateToSearchParams(next).toString();
      const href = search ? `${pathname}?${search}` : pathname;
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const updateQuery = useCallback(
    (change: (current: HazardsQuery) => Partial<HazardsQuery>, mode: NavigationMode = "push") =>
      navigate((current) => ({ query: { ...current.query, ...change(current.query) } }), mode),
    [navigate],
  );

  const toggleStatus = useCallback(
    (hazardState: HazardState) => updateQuery((current) => ({ states: toggleState(current.states, hazardState) })),
    [updateQuery],
  );
  const setStatuses = useCallback((states: HazardState[]) => updateQuery(() => ({ states })), [updateQuery]);
  const resetStatuses = useCallback(() => updateQuery(() => ({ states: DEFAULT_HAZARDS_QUERY.states })), [updateQuery]);
  const toggleCrewCode = useCallback(
    (crew: string) => updateQuery((current) => ({ crews: toggleCrew(current.crews, crew) })),
    [updateQuery],
  );
  const resetCrews = useCallback(() => updateQuery(() => ({ crews: DEFAULT_HAZARDS_QUERY.crews })), [updateQuery]);
  const setPropertyType = useCallback(
    (propertyType: PropertyType | null) => updateQuery(() => ({ propertyType })),
    [updateQuery],
  );
  // Typing is replaced, not pushed, so Back does not step through every keystroke.
  const setSearch = useCallback(
    (value: string) => {
      const q = normalizeSearch(value);
      if (q !== latest.current.query.q) updateQuery(() => ({ q }), "replace");
    },
    [updateQuery],
  );
  const setDateRange = useCallback(
    (from: string | null, to: string | null) => updateQuery(() => normalizeDateRange(from, to)),
    [updateQuery],
  );
  const setHasPhoto = useCallback((hasPhoto: boolean | null) => updateQuery(() => ({ hasPhoto })), [updateQuery]);
  const setNeedsAttention = useCallback(
    (needsAttention: boolean) => updateQuery(() => ({ needsAttention })),
    [updateQuery],
  );
  // Clearing filters keeps the sort and the selected hazard.
  const resetFilters = useCallback(() => updateQuery(() => DEFAULT_HAZARDS_QUERY), [updateQuery]);

  const setSort = useCallback((sort: HazardSort) => navigate(() => ({ sort }), "push"), [navigate]);
  const setAsset = useCallback(
    (asset: string | null) => {
      if (asset !== latest.current.asset) navigate(() => ({ asset }), "replace");
    },
    [navigate],
  );
  const applyView = useCallback(
    (query: HazardsQuery, sort: HazardSort) => navigate(() => ({ query, sort }), "push"),
    [navigate],
  );

  return {
    query: state.query,
    sort: state.sort,
    asset: state.asset,
    toggleStatus,
    setStatuses,
    resetStatuses,
    toggleCrewCode,
    resetCrews,
    setPropertyType,
    setSearch,
    setDateRange,
    setHasPhoto,
    setNeedsAttention,
    resetFilters,
    setSort,
    setAsset,
    applyView,
  };
}
