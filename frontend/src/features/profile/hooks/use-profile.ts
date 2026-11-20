import useSWR from "swr";
import { getProfile } from "@/features/profile/api";
import { isUnauthorized, profileLoadErrorMessage } from "@/features/profile/utils/errors";
import { isRetryableError } from "@/lib/api/errors";

/** Cleared with every other entry by the shell's cache wipe on sign out. */
export const PROFILE_KEY = "me/profile";

export function useProfile() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(PROFILE_KEY, getProfile, {
    // A refetch while the user is typing would change the values the form compares with.
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: isRetryableError,
  });

  return {
    profile: data,
    errorMessage: error ? profileLoadErrorMessage(error) : undefined,
    isUnauthorized: isUnauthorized(error),
    isLoading: isLoading && !data,
    isRetrying: isValidating && Boolean(error),
    retry: () => mutate(),
  };
}
