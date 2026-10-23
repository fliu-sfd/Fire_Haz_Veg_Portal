import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { authErrorMessage, getMyProperties } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";

/** Mounted only after the resident guard passes; cache entries belong to the account. */
export function useMyProperties(accountId: string) {
  const router = useRouter();
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["residents/me/properties", accountId],
    () => getMyProperties(),
  );
  const redirectTo = error instanceof ApiError
    ? error.status === 401 ? "/sign-in" : error.status === 403 ? "/dashboard" : null
    : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return {
    properties: data,
    errorMessage: error ? authErrorMessage(error) : undefined,
    isLoading,
    isValidating,
    isRedirecting: Boolean(redirectTo),
    refresh: () => mutate(),
  };
}
