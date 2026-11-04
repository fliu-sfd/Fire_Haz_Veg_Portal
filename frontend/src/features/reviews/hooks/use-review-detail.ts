"use client";

import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import type { Submission } from "@/features/submissions/types";
import { submissionError } from "@/features/submissions/utils";
import { getReviewDetail } from "../api";

export function useReviewDetail(submissionId: string) {
  const router = useRouter();
  const { account } = useCurrentAccount();
  const { status } = useRequireRole("admin");
  const { mutate: refreshCache } = useSWRConfig();
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    status === "allowed" && account ? ["review-detail", account.id, submissionId] : null,
    () => getReviewDetail(submissionId),
  );

  function reviewed(result: Submission) {
    void refreshCache((key) => Array.isArray(key) &&
      ["review-detail", "review-inbox", "review-count", "assessment", "submissions", "admin/hazards"].includes(key[0]));
    router.push(`/dashboard/reviews?decision=${result.status}`);
  }

  return { data, isLoading, isValidating, access: status,
    errorMessage: error ? submissionError(error) : undefined,
    refresh: () => void mutate(), reviewed };
}
