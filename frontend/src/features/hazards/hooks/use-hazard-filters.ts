import useSWR from "swr";
import { getHazardFilters } from "@/features/hazards/api";

// The options only change when a new file is imported, so a cached copy is never refetched.
const STATIC = { revalidateIfStale: false, revalidateOnReconnect: false } as const;

/** Pass false to hold the request until the role check passes. */
export function useHazardFilters(enabled: boolean) {
  const { data, error } = useSWR(enabled ? "admin/hazards/filters" : null, getHazardFilters, STATIC);
  return { options: data, error };
}
