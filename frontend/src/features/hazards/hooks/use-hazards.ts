import useSWR from "swr";
import { listHazards } from "@/features/hazards/api";
import type { HazardsQuery } from "@/features/hazards/types";
import { accessProblem, hazardErrorMessage } from "@/features/hazards/utils/errors";

/**
 * Pass null to hold the request (for example until the role check passes).
 * While new filters load, `data` keeps the previous markers so the map never blanks.
 */
export function useHazards(query: HazardsQuery | null) {
  // Keyed by the normalized query, so identical filters share one cache entry and
  // a slow older response can never land on a newer key.
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    query ? (["admin/hazards", query] as const) : null,
    ([, key]) => listHazards(key),
    { keepPreviousData: true },
  );

  return {
    data,
    error,
    errorMessage: error ? hazardErrorMessage(error) : undefined,
    accessProblem: accessProblem(error),
    isFirstLoad: isLoading && !data,
    // True while `data` still belongs to the previous filters.
    isShowingPrevious: isLoading && Boolean(data),
    isValidating,
    refresh: () => mutate(),
  };
}
