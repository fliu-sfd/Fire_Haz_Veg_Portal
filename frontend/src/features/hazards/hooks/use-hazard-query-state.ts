import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { HazardState, HazardsQuery, PropertyType } from "@/features/hazards/types";
import {
  DEFAULT_HAZARDS_QUERY,
  hazardsQueryToParams,
  parseHazardsQuery,
  toggleCrew,
  toggleState,
} from "@/features/hazards/utils/query-params";

/** Hazard map filters kept in the URL so views are shareable and survive back/forward. */
export function useHazardQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseHazardsQuery(searchParams), [searchParams]);

  // Menus stay open for several picks, and a second pick can land before the URL from
  // the first one does. Each change builds on the latest requested filters, not the URL.
  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  const update = useCallback(
    (change: (current: HazardsQuery) => Partial<HazardsQuery>) => {
      const next = { ...latest.current, ...change(latest.current) };
      latest.current = next;
      const search = hazardsQueryToParams(next).toString();
      router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const toggleStatus = useCallback(
    (state: HazardState) => update((current) => ({ states: toggleState(current.states, state) })),
    [update],
  );
  const resetStatuses = useCallback(() => update(() => ({ states: DEFAULT_HAZARDS_QUERY.states })), [update]);
  const toggleCrewCode = useCallback(
    (crew: string) => update((current) => ({ crews: toggleCrew(current.crews, crew) })),
    [update],
  );
  const resetCrews = useCallback(() => update(() => ({ crews: DEFAULT_HAZARDS_QUERY.crews })), [update]);
  const setPropertyType = useCallback((propertyType: PropertyType | null) => update(() => ({ propertyType })), [update]);
  const resetFilters = useCallback(() => update(() => DEFAULT_HAZARDS_QUERY), [update]);

  return { query, toggleStatus, resetStatuses, toggleCrewCode, resetCrews, setPropertyType, resetFilters };
}
