import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useHazardFilters } from "@/features/hazards/hooks/use-hazard-filters";
import { useHazardList } from "@/features/hazards/hooks/use-hazard-list";
import { useHazardQueryState } from "@/features/hazards/hooks/use-hazard-query-state";
import { useHazardSelection } from "@/features/hazards/hooks/use-hazard-selection";
import { useHazards } from "@/features/hazards/hooks/use-hazards";
import type { Hazard, HazardState, WorkspaceView } from "@/features/hazards/types";
import { filterChips, resultSummary, type FilterChip } from "@/features/hazards/utils/display";
import { accessProblem } from "@/features/hazards/utils/errors";
import { statesAfterTileClick, summaryTiles } from "@/features/hazards/utils/summary";
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
  const { setStatuses, setNeedsAttention } = filtersState;

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
  const selection = useHazardSelection({
    asset: filtersState.asset,
    hazards: items,
    isSettled: isSettled && Boolean(data),
    setAsset: filtersState.setAsset,
  });
  const apiKey = hazardsQueryToApiParams(query).toString();
  const list = useHazardList(items, filtersState.sort, selection.selectedAssetId, `${apiKey}|${filtersState.sort}`);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("map");

  const { select } = selection;
  const selectFromList = useCallback(
    (assetId: string) => {
      // Below 1024 px the list hides the map, so a pick switches back to it and focuses the marker.
      const isNarrow = window.matchMedia("(max-width: 1023.98px)").matches;
      if (isNarrow) setWorkspaceView("map");
      select(assetId, "list", { focusMarker: isNarrow });
    },
    [select],
  );

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
    summaryTiles: data ? summaryTiles(data.summary, total, query) : null,
    onStateTile: (state: HazardState) => setStatuses(statesAfterTileClick(query.states, state)),
    toggleNeedsAttention: () => setNeedsAttention(!query.needsAttention),
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
    fitKey: isSettled && data ? apiKey : null,
    selectedAssetId: selection.selectedAssetId,
    selectRequest: selection.request,
    selectHazard: selection.select,
    onMapSelect: selection.onMapSelect,
    missingAssetId: selection.missingAssetId,
    dismissMissingAsset: selection.dismissNotice,
    sort: filtersState.sort,
    setSort: filtersState.setSort,
    listRows: list.rows,
    listRemaining: list.remaining,
    showMoreRows: list.showMore,
    selectFromList,
    workspaceView,
    setWorkspaceView,
  };
}

export type HazardsPageModel = ReturnType<typeof useHazardsPage>;
