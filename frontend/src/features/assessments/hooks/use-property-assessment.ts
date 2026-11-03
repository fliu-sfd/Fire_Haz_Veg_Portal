"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { assessmentErrorMessage, getPropertyAssessment } from "@/features/assessments/api";
import { ApiError } from "@/lib/api/client";

export function usePropertyAssessment(assetId: string) {
  const router = useRouter();
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["assessment", assetId],
    () => getPropertyAssessment(assetId),
  );
  const redirectTo = error instanceof ApiError && error.status === 401 ? "/sign-in" : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return {
    assessment: data,
    errorMessage: error ? assessmentErrorMessage(error) : undefined,
    isLoading,
    isValidating,
    isRedirecting: Boolean(redirectTo),
    refresh: () => mutate(),
  };
}
