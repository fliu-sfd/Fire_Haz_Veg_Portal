"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import type { Submission } from "@/features/submissions/types";
import { useReviewDecision } from "../hooks/use-review-decision";
import { REVIEW_COMMENT_MAX_LENGTH, SEND_BACK_REASONS } from "../utils/send-back-reasons";
import type { SendBackReason } from "../utils/send-back-reasons";
import { SendBackReasons } from "./send-back-reasons";

export function ReviewDecisionForm({ submission, onReviewed }: {
  submission: Submission;
  onReviewed: (result: Submission) => void;
}) {
  const id = useId();
  const form = useReviewDecision(submission, onReviewed);
  const [lastAdded, setLastAdded] = useState<string>();
  const sendingBack = form.decision === "rejected";

  function pickReason(reason: SendBackReason) {
    form.addReason(reason);
    setLastAdded(reason.label);
  }

  return (
    <form onSubmit={form.submit} aria-busy={form.saving} aria-labelledby={`${id}-title`} className="mt-5 space-y-4 rounded-lg border border-denim/30 bg-blue-50/40 p-4 sm:p-5">
      <div>
        <h4 id={`${id}-title`} className="text-base font-semibold text-charcoal">Review this submission</h4>
        <p className="mt-1 text-sm leading-6 text-city-dark">Compare the homeowner photos with the original inspection before saving a decision. Your comment will be visible to the homeowner.</p>
      </div>
      <fieldset disabled={form.saving} className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-charcoal">Department decision</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-city-light bg-white p-3 text-sm text-charcoal">
          <input type="radio" name={`${id}-decision`} value="approved" checked={form.decision === "approved"} onChange={() => form.setDecision("approved")} />
          Approve — completed work verified
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-city-light bg-white p-3 text-sm text-charcoal">
          <input type="radio" name={`${id}-decision`} value="rejected" checked={form.decision === "rejected"} onChange={() => form.setDecision("rejected")} />
          Send back — more work or evidence needed
        </label>
      </fieldset>
      {sendingBack ? (
        <div>
          <SendBackReasons reasons={SEND_BACK_REASONS} comment={form.comment} disabled={form.saving} onPick={pickReason} />
          <p aria-live="polite" className="mt-2 min-h-5 text-xs text-city-dark">{lastAdded ? `Added “${lastAdded}” to the comment.` : ""}</p>
        </div>
      ) : null}
      <div>
        <label htmlFor={`${id}-comment`} className="text-sm font-semibold text-charcoal">Department comment {sendingBack ? "(required)" : "(optional)"}</label>
        <textarea id={`${id}-comment`} value={form.comment} onChange={(event) => form.setComment(event.target.value)} required={sendingBack} maxLength={REVIEW_COMMENT_MAX_LENGTH} rows={3} disabled={form.saving} className="mt-2 block w-full min-w-0 rounded-md border border-silver-spur/60 bg-white p-3 text-base text-charcoal sm:text-sm" placeholder={sendingBack ? "Pick a quick reason above or write your own." : "Explain your decision or what the homeowner needs to do next."} />
      </div>
      {form.error ? <FormAlert variant="error" title="Decision could not be saved">{form.error} Refresh the assessment if the evidence changed.</FormAlert> : null}
      <Button type="submit" disabled={form.saving || !form.decision} className="min-h-11 w-full sm:w-auto">{form.saving ? "Saving decision…" : "Save decision"}</Button>
    </form>
  );
}
