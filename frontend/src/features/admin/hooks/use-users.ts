import useSWR from "swr";
import { listUsers } from "@/features/admin/api";
import type { UsersQuery } from "@/features/admin/types";
import { accessProblem, adminErrorMessage } from "@/features/admin/utils/errors";

/**
 * Pass null to hold the request (for example until the role check passes).
 * While a new page or filter loads, `data` keeps the previous rows.
 */
export function useUsers(query: UsersQuery | null) {
  // Keyed by the normalized query, so identical filters share one cache entry and
  // a slow older response can never land on a newer key.
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    query ? (["admin/users", query] as const) : null,
    ([, key]) => listUsers(key),
    { keepPreviousData: true },
  );

  return {
    data,
    error,
    errorMessage: error ? adminErrorMessage(error) : undefined,
    accessProblem: accessProblem(error),
    isLoading: isLoading && !data,
    isValidating,
    refresh: () => mutate(),
  };
}
