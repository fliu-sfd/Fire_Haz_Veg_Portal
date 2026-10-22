import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useHazardFilters } from "@/features/hazards/hooks/use-hazard-filters";
import { useHazardQueryState } from "@/features/hazards/hooks/use-hazard-query-state";
import { useHazards } from "@/features/hazards/hooks/use-hazards";
import type { Hazard } from "@/features/hazards/types";
import { filterChips, resultSummary, type FilterChip } from "@/features/hazards/utils/display";
import { accessProblem } from "@/features/hazards/utils/errors";
import {
  activeFilterCount,
  hazardsQueryToApiParams,
  withKnownCrews,
} from "@/features/hazards/utils/query-params";

const NO_HAZARDS: Hazard[] = [];

export function useHazardsPage() {
  const router = useRouter();
  const { status: access } = useRequireRole("admin");
  const allowed = access === "allowed";
  const filtersState = useHazardQueryState();
  const { options, error: optionsError } = useHazardFilters(allowed);

  const query = useMemo(
    () => (options ? withKnownCrews(filtersState.query, options.crews) : filtersState.query),
    [options, filtersState.query],
  );
  const hazards = useHazards(allowed ? query : null);

  const problem = hazards.accessProblem ?? accessProblem(optionsError);
  useEffect(() => {
    if (problem === "unauthorized") router.replace("/sign-in");
  }, [problem, router]);

  const { toggleStatus, resetStatuses, toggleCrewCode, resetCrews, setPropertyType, resetFilters } = filtersState;

  function removeChip(chip: FilterChip) {
    if (chip.kind === "state") resetStatuses();
    else if (chip.kind === "crew") toggleCrewCode(chip.crew);
    else setPropertyType(null);
  }

  const data = hazards.data;
  const items = data?.items ?? NO_HAZARDS;
  const total = data?.total ?? 0;
  const activeCount = activeFilterCount(query);
  const isSettled = !hazards.isFirstLoad && !hazards.isShowingPrevious;

  return {
    access,
    query,
    chips: filterChips(query),
    activeCount,
    filtersActive: activeCount > 0,
    crewOptions: options?.crews ?? [],
    // A choice between one type is no choice, so the control hides until Residential data exists.
    propertyTypeOptions: options && options.propertyTypes.length > 1 ? options.propertyTypes : [],
    toggleStatus,
    resetStatuses,
    toggleCrew: toggleCrewCode,
    resetCrews,
    setPropertyType,
    removeChip,
    clearFilters: resetFilters,
    hazards: items,
    hasData: Boolean(data),
    seasonYear: data?.seasonYear ?? null,
    summary: data ? resultSummary(items.length, total) : "",
    isCapped: items.length < total,
    isEmpty: isSettled && Boolean(data) && items.length === 0,
    isFirstLoad: hazards.isFirstLoad,
    isUpdating: !hazards.isFirstLoad && hazards.isValidating,
    errorMessage: hazards.errorMessage,
    isForbidden: problem === "forbidden",
    refresh: hazards.refresh,
    // Changes only when settled data for new filters arrives, so a background
    // revalidation never refits the map over the user's own pan and zoom.
    fitKey: isSettled && data ? hazardsQueryToApiParams(query).toString() : null,
  };
}

export type HazardsPageModel = ReturnType<typeof useHazardsPage>;
