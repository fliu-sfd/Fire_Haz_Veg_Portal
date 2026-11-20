"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { getSubmissions } from "../api";
import type { Submission } from "../types";
import { submissionError } from "../utils";

export function useAssessmentEvidence(assessmentId: string, needsAction: boolean) {
  const { account } = useCurrentAccount();
  const { mutate: refreshCache } = useSWRConfig();
  const [editing, setEditing] = useState<Submission>();
  // Scope cached evidence and form drafts to the signed-in account and inspection.
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    account ? ["submissions", account.id, assessmentId] : null,
    () => getSubmissions(assessmentId),
  );
  const latest = data?.[0];
  const canSubmit = needsAction && account?.role === "resident" && Boolean(data)
    && (!latest || latest.status === "rejected");

  function submitted(submission: Submission) {
    void mutate((current) => current?.some((item) => item.id === submission.id)
      ? current.map((item) => item.id === submission.id ? submission : item)
      : [submission, ...(current ?? [])], { revalidate: false });
    setEditing(undefined);
    void refreshCache((key) => Array.isArray(key) && ["assessment", "review-inbox", "review-count", "admin/hazards"].includes(key[0]));
  }

  return { account, data, latest, editing, setEditing, errorMessage: error ? submissionError(error) : undefined, isLoading, isValidating, refresh: () => mutate(), canSubmit, submitted };
}
