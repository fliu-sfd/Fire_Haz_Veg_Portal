import useSWR from "swr";
import { getUser } from "@/features/admin/api";
import { accessProblem, userLoadErrorMessage } from "@/features/admin/utils/errors";
import { isRetryableError } from "@/lib/api/errors";

export const USER_DETAIL_KEY = "admin/user";

export function userDetailKey(id: string) {
  return [USER_DETAIL_KEY, id] as const;
}

/** Pass null to hold the request while no user is selected. */
export function useUserDetail(id: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? userDetailKey(id) : null,
    ([, key]) => getUser(key),
    {
      // A refetch while the admin is typing would change the values the form compares with.
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // A missing user or a bad id will not appear on a retry.
      shouldRetryOnError: isRetryableError,
    },
  );

  return {
    user: data,
    errorMessage: error ? userLoadErrorMessage(error) : undefined,
    accessProblem: accessProblem(error),
    isLoading: isLoading && !data,
    isRetrying: isValidating && Boolean(error),
    retry: () => mutate(),
  };
}
