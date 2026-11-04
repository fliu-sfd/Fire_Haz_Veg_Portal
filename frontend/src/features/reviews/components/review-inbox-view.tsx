"use client";

import Link from "next/link";
import { Bell, CircleCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Loader } from "@/components/ui/loader";
import { useReviewInbox } from "../hooks/use-review-inbox";
import { evidenceDate } from "@/features/submissions/utils";
import { inspectionDate } from "@/features/assessments/utils/display";
import type { ReviewDecision } from "../types";

export function ReviewInboxView({ decision }: { decision?: ReviewDecision }) {
  const page = useReviewInbox();
  return (
    <div className="mx-auto min-w-0 max-w-5xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-blue">Department notifications</p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-light text-charcoal">Review inbox {page.data ? <span className="rounded-full bg-blue-50 px-3 py-1 text-base font-semibold tabular-nums text-civic-blue">{page.data.total}</span> : null}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-city-dark">Homeowners have submitted completion photos for these properties. Open a submission to compare evidence, leave a comment, and save your decision.</p>
          <p className="mt-2 text-xs text-muted-foreground">Oldest submissions first. Updates every 30 seconds. Reviewed submissions leave this inbox and remain in property history.</p>
        </div>
        <Button variant="secondary" onClick={page.refresh} disabled={page.isValidating} className="inline-flex min-h-11 items-center justify-center gap-2"><RefreshCw aria-hidden="true" className={`size-4 ${page.isValidating ? "animate-spin motion-reduce:animate-none" : ""}`} />Refresh</Button>
      </header>
      {decision ? <div role="status" className="mt-6"><FormAlert variant="success" title="Review saved">{decision === "approved" ? "The issue was approved and marked closed." : "The issue was sent back and remains open. Your reason is visible to the homeowner."}</FormAlert></div> : null}
      {page.errorMessage ? <div className="mt-6"><FormAlert variant="error" title="We could not load the review inbox">{page.errorMessage}</FormAlert></div> : null}
      {page.isLoading ? <Loader inline label="Loading submissions…" /> : null}
      {page.data?.total === 0 ? <div className="mt-8 flex items-start gap-3 rounded-lg border border-city-light bg-white p-6"><CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success-green" /><div><h2 className="font-semibold text-charcoal">You are all caught up</h2><p className="mt-1 text-sm text-city-dark">New homeowner submissions will appear here.</p></div></div> : null}
      <ul className="mt-6 space-y-3">
        {page.data?.items.map((item) => (
          <li key={item.submissionId} className="min-w-0 rounded-lg border border-city-light bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-start gap-2 text-sm font-semibold text-charcoal [overflow-wrap:anywhere]"><Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-civic-blue" /><span>{item.homeownerName} submitted completion photos</span></p>
                <p className="mt-2 text-sm text-city-dark [overflow-wrap:anywhere]">Asset {item.assetId}{item.siteAddress ? ` · ${item.siteAddress}` : ""}</p>
                <p className="mt-2 text-xs text-muted-foreground">Inspected {inspectionDate(item.inspectedAt)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-city-dark [overflow-wrap:anywhere]">{item.inspectionComments || "No inspection comments recorded."}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground"><time dateTime={item.createdAt}>{evidenceDate(item.createdAt)}</time> · {item.photoCount} {item.photoCount === 1 ? "photo" : "photos"}</p>
                {item.updatedAt ? <p className="mt-1 text-xs text-civic-blue">Homeowner updated evidence <time dateTime={item.updatedAt}>{evidenceDate(item.updatedAt)}</time></p> : null}
              </div>
              <Link href={`/dashboard/reviews/${encodeURIComponent(item.submissionId)}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-denim px-4 py-2 text-sm font-semibold text-white hover:bg-deep-blue">Review submission</Link>
            </div>
          </li>
        ))}
      </ul>
      {page.data && page.data.total > page.data.limit ? (
        <nav aria-label="Review inbox pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page.data.offset === 0 || page.isLoading} onClick={page.previous}>Previous</Button>
          <p className="text-sm text-city-dark">{page.data.offset + 1}–{Math.min(page.data.offset + page.data.items.length, page.data.total)} of {page.data.total}</p>
          <Button variant="secondary" disabled={page.data.offset + page.data.limit >= page.data.total || page.isLoading} onClick={page.next}>Next</Button>
        </nav>
      ) : null}
    </div>
  );
}
