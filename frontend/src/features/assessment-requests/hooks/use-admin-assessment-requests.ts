"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  listAssessmentRequests,
  markAssessmentRequestHandled,
} from "@/features/assessment-requests/api";
import type { AssessmentRequestStatus } from "@/features/assessment-requests/types";
import { assessmentRequestError } from "@/features/assessment-requests/utils";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";

export function useAdminAssessmentRequests() {
  const { account } = useCurrentAccount();
  const [status, setStatus] = useState<AssessmentRequestStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [handlingId, setHandlingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    account?.role === "admin" ? ["assessment-requests", account.id, status, offset] : null,
    () => listAssessmentRequests(status, offset),
    {
      onSuccess: (response) => {
        if (offset > 0 && offset >= response.total) {
          setOffset(Math.max(0, (Math.ceil(response.total / 25) - 1) * 25));
        }
      },
    },
  );

  function changeStatus(next: AssessmentRequestStatus | null) {
    setStatus(next);
    setOffset(0);
    setActionError(undefined);
  }

  async function handle(id: string) {
    setHandlingId(id);
    setActionError(undefined);
    try {
      await markAssessmentRequestHandled(id);
      await mutate();
    } catch (handleError) {
      setActionError(assessmentRequestError(handleError));
    } finally {
      setHandlingId(undefined);
    }
  }

  return {
    data,
    status,
    errorMessage: actionError ?? (error ? assessmentRequestError(error) : undefined),
    isLoading,
    isValidating,
    handlingId,
    changeStatus,
    handle,
    refresh: () => void mutate(),
    previous: () => setOffset(Math.max(0, offset - 25)),
    next: () => setOffset(offset + 25),
  };
}
