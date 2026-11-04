"use client";

import { useState } from "react";
import useSWR from "swr";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { getReviewInbox, pendingReviewCount } from "../api";
import { submissionError } from "@/features/submissions/utils";

export function useReviewInboxCount() {
  const { account } = useCurrentAccount();
  const { data } = useSWR(account?.role === "admin" ? ["review-count", account.id] : null, pendingReviewCount, { refreshInterval: 30_000 });
  return data;
}

export function useReviewInbox() {
  const { account } = useCurrentAccount();
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    account?.role === "admin" ? ["review-inbox", account.id, offset] : null,
    () => getReviewInbox(offset), {
      refreshInterval: 30_000,
      onSuccess: (response) => {
        if (offset > 0 && offset >= response.total) {
          setOffset((current) => current === offset ? Math.max(0, (Math.ceil(response.total / 25) - 1) * 25) : current);
        }
      },
    },
  );
  return { data, errorMessage: error ? submissionError(error) : undefined, isLoading, isValidating,
    refresh: () => void mutate(), previous: () => setOffset(Math.max(0, offset - 25)), next: () => setOffset(offset + 25) };
}
