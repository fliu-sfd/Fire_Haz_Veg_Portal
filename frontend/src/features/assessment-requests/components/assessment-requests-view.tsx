"use client";

import { CheckCircle2, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { useAdminAssessmentRequests } from "@/features/assessment-requests/hooks/use-admin-assessment-requests";
import type { AssessmentRequestStatus } from "@/features/assessment-requests/types";
import { assessmentRequestDate } from "@/features/assessment-requests/utils";

const FILTERS: { value: AssessmentRequestStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "handled", label: "Handled" },
];

export function AssessmentRequestsView() {
  const page = useAdminAssessmentRequests();

  return (
    <div className="mx-auto min-w-0 max-w-5xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-blue">Homeowner requests</p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-light text-charcoal">
            Full assessment requests
            {page.data ? <span className="rounded-full bg-blue-50 px-3 py-1 text-base font-semibold tabular-nums text-civic-blue">{page.data.total}</span> : null}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-city-dark">
            Review requests submitted by homeowners and mark them handled after follow-up is complete.
          </p>
        </div>
        <Button variant="secondary" onClick={page.refresh} disabled={page.isValidating} className="inline-flex min-h-11 items-center justify-center gap-2">
          <RefreshCw aria-hidden="true" className={`size-4 ${page.isValidating ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter assessment requests">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={page.status === filter.value ? "primary" : "secondary"}
            aria-pressed={page.status === filter.value}
            onClick={() => page.changeStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {page.errorMessage ? <div className="mt-6"><FormAlert variant="error" title="We could not load assessment requests">{page.errorMessage}</FormAlert></div> : null}
      {page.isLoading ? <Loader inline label="Loading assessment requests…" /> : null}

      {page.data?.total === 0 ? (
        <div className="mt-8 flex items-start gap-3 rounded-lg border border-city-light bg-white p-6">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success-green" />
          <div>
            <h2 className="font-semibold text-charcoal">No matching requests</h2>
            <p className="mt-1 text-sm text-city-dark">New homeowner requests will appear here.</p>
          </div>
        </div>
      ) : null}

      <ul className="mt-6 space-y-3">
        {page.data?.items.map((request) => (
          <li key={request.id} className="rounded-lg border border-city-light bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="flex items-center gap-2 font-semibold text-charcoal">
                    <ClipboardList aria-hidden="true" className="size-4 text-civic-blue" />
                    Asset {request.assetId}
                  </h2>
                  <Badge variant="secondary" className={request.status === "open" ? "bg-orange-50 text-charcoal" : "bg-lime-50 text-success-dark"}>
                    {request.status === "open" ? "Open" : "Handled"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-city-dark">Requested by {request.homeownerName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <time dateTime={request.requestedAt}>{assessmentRequestDate(request.requestedAt)}</time>
                </p>
                {request.note ? <p className="mt-4 whitespace-pre-line rounded bg-city-light p-3 text-sm leading-6 text-charcoal">{request.note}</p> : null}
                {request.handledAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Handled {assessmentRequestDate(request.handledAt)}{request.handledByName ? ` by ${request.handledByName}` : ""}
                  </p>
                ) : null}
              </div>
              {request.status === "open" ? (
                <Button
                  onClick={() => void page.handle(request.id)}
                  disabled={Boolean(page.handlingId)}
                  className="min-h-11 shrink-0"
                >
                  {page.handlingId === request.id ? "Saving…" : "Mark handled"}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {page.data && page.data.total > page.data.limit ? (
        <nav aria-label="Assessment request pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page.data.offset === 0 || page.isLoading} onClick={page.previous}>Previous</Button>
          <p className="text-sm text-city-dark">
            {page.data.offset + 1}–{Math.min(page.data.offset + page.data.items.length, page.data.total)} of {page.data.total}
          </p>
          <Button variant="secondary" disabled={page.data.offset + page.data.limit >= page.data.total || page.isLoading} onClick={page.next}>Next</Button>
        </nav>
      ) : null}
    </div>
  );
}
