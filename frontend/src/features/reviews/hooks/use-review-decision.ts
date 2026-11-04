"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { saveReview } from "../api";
import type { ReviewDecision } from "../types";
import type { Submission } from "@/features/submissions/types";
import { submissionError } from "@/features/submissions/utils";

export function useReviewDecision(submission: Submission, onReviewed: (result: Submission) => void) {
  const [decision, setDecision] = useState<ReviewDecision | "">("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || saving) return;
    if (decision === "rejected" && !comment.trim()) {
      setError("Explain what work or evidence is needed before sending this back.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      onReviewed(await saveReview(submission, decision, comment));
    } catch (cause) {
      setError(submissionError(cause));
    } finally {
      setSaving(false);
    }
  }

  return { decision, setDecision, comment, setComment, saving, error, submit };
}
