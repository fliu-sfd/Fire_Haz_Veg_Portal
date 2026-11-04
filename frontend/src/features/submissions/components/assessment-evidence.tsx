"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Loader } from "@/components/ui/loader";
import { useAssessmentEvidence } from "../hooks/use-assessment-evidence";
import { SubmissionHistory } from "./submission-history";
import { UploadForm } from "./upload-form";

export function AssessmentEvidence({ assessmentId, needsAction }: {
  assessmentId: string;
  needsAction: boolean;
}) {
  const { account, data, latest, editing, setEditing, errorMessage, isLoading, isValidating, refresh, canSubmit, submitted } = useAssessmentEvidence(assessmentId, needsAction);
  const showForm = canSubmit || Boolean(editing);

  return (
    <section id={`evidence-${assessmentId}`} aria-label="Completion photos" className="mt-6 min-w-0 scroll-mt-6 border-t border-city-light pt-6">
      {!account || isLoading ? <Loader inline label="Loading completion photos…" /> : null}
      {errorMessage ? (
        <div className="mb-5 space-y-3">
          <FormAlert variant="error" title="We could not load the submission history">{errorMessage}</FormAlert>
          <Button variant="secondary" disabled={isValidating} onClick={() => void refresh()} className="min-h-11">Try again</Button>
        </div>
      ) : null}
      {account ? (
        <div className="space-y-5">
          {latest?.status === "pending_review" ? (
            <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div><h3 className="text-sm font-semibold">{latest.isOwnSubmission ? "Your action is complete — photos submitted" : "Completion photos submitted"}</h3>
                <p className="mt-1 text-sm leading-6">{account.role === "admin" ? "Review the homeowner's evidence below alongside the original crew finding. The hazard remains unresolved until a department decision is recorded." : latest.canEdit ? "Your evidence is saved and awaiting department review. You can edit your pending submission below. The department must verify the work before the hazard is cleared." : "Evidence has been saved for this property and is awaiting department review. The department must verify the work before the hazard is cleared."}</p>
              </div>
            </div>
          ) : null}
          <div className={`grid min-w-0 gap-6 ${showForm ? "lg:grid-cols-2 lg:gap-8" : ""}`}>
            {showForm ? <UploadForm key={`${account.id}:${assessmentId}:${editing?.id ?? "new"}`} assessmentId={assessmentId} onSubmitted={submitted} editing={editing} onCancel={() => setEditing(undefined)} /> : null}
            {data ? <SubmissionHistory submissions={data} besideForm={showForm} onEdit={setEditing} onReviewed={submitted} /> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
