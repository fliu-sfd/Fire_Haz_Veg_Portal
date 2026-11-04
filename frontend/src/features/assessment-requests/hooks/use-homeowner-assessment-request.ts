"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  createAssessmentRequest,
  getOpenAssessmentRequest,
} from "@/features/assessment-requests/api";
import { assessmentRequestError } from "@/features/assessment-requests/utils";

export function useHomeownerAssessmentRequest(assetId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const key = ["assessment-request", assetId] as const;
  const { data, error, isLoading, mutate } = useSWR(key, () => getOpenAssessmentRequest(assetId));

  async function submit(note: string) {
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const request = await createAssessmentRequest(assetId, note);
      await mutate(request, { revalidate: false });
      return request;
    } catch (submitError) {
      setSaveError(assessmentRequestError(submitError));
      throw submitError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    request: data,
    errorMessage: saveError ?? (error ? assessmentRequestError(error) : undefined),
    isLoading,
    isSaving,
    submit,
    retry: () => void mutate(),
  };
}
