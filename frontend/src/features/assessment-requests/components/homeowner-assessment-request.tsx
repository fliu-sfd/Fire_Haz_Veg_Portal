"use client";

import { useState } from "react";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Loader } from "@/components/ui/loader";
import { TextareaField } from "@/components/ui/textarea-field";
import { useHomeownerAssessmentRequest } from "@/features/assessment-requests/hooks/use-homeowner-assessment-request";
import {
  assessmentRequestDate,
  MAX_REQUEST_NOTE_LENGTH,
} from "@/features/assessment-requests/utils";

export function HomeownerAssessmentRequest({ assetId }: { assetId: string }) {
  const requestState = useHomeownerAssessmentRequest(assetId);
  const [note, setNote] = useState("");

  if (requestState.isLoading) {
    return <Loader inline label="Checking assessment requests…" />;
  }

  if (requestState.request) {
    return (
      <section className="mt-8 rounded-lg border border-city-light bg-white p-6 shadow-sm" aria-labelledby="full-assessment-heading">
        <div className="flex items-start gap-3">
          <ClipboardCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success-green" />
          <div>
            <h2 id="full-assessment-heading" className="text-xl font-medium text-charcoal">Full assessment requested</h2>
            <p className="mt-2 text-sm leading-6 text-city-dark">
              The fire-prevention team can see this request in its review queue. You do not need to submit another request.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-civic-blue">
              <CalendarClock aria-hidden="true" className="size-4" />
              Requested {assessmentRequestDate(requestState.request.requestedAt)}
            </p>
            {requestState.request.note ? <p className="mt-3 whitespace-pre-line text-sm text-city-dark">Note: {requestState.request.note}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-city-light bg-white p-6 shadow-sm" aria-labelledby="full-assessment-heading">
      <h2 id="full-assessment-heading" className="text-xl font-medium text-charcoal">Request a full home assessment</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-city-dark">
        Ask the fire-prevention team to review the full property. Add a note if there is something they should know.
      </p>
      {requestState.errorMessage ? (
        <div className="mt-4">
          <FormAlert variant="error" title="We could not submit the request">{requestState.errorMessage}</FormAlert>
        </div>
      ) : null}
      <form
        className="mt-5 max-w-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void requestState.submit(note).catch(() => undefined);
        }}
      >
        <TextareaField
          id={`assessment-request-note-${assetId}`}
          label="Note (optional)"
          hint="Briefly describe why you are requesting an assessment."
          rows={4}
          maxLength={MAX_REQUEST_NOTE_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          counter={`${note.length} of ${MAX_REQUEST_NOTE_LENGTH}`}
          disabled={requestState.isSaving}
        />
        <Button type="submit" disabled={requestState.isSaving} className="mt-4 min-h-11">
          {requestState.isSaving ? "Submitting…" : "Request full assessment"}
        </Button>
      </form>
    </section>
  );
}
