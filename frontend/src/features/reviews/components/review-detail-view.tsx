"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Loader } from "@/components/ui/loader";
import { CrewPhotoGallery } from "@/features/assessments/components/crew-photo-gallery";
import { inspectionDate, statusLabel } from "@/features/assessments/utils/display";
import { SubmissionStatus } from "@/features/submissions/components/evidence-status";
import { SubmissionHistory, SubmissionPhotoPreview } from "@/features/submissions/components/submission-history";
import { evidenceDate } from "@/features/submissions/utils";
import { useReviewDetail } from "../hooks/use-review-detail";
import { ReviewDecisionForm } from "./review-decision-form";

export function ReviewDetailView({ submissionId }: { submissionId: string }) {
  const page = useReviewDetail(submissionId);
  if (page.access !== "allowed") return <Loader label="Checking access…" />;
  const back = <Link href="/dashboard/reviews" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-civic-blue hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to review inbox</Link>;
  if (page.errorMessage) return <div className="space-y-5">{back}<FormAlert variant="error" title="We could not load this submission">{page.errorMessage}</FormAlert><Button onClick={page.refresh} disabled={page.isValidating}>Try again</Button></div>;
  if (page.isLoading || !page.data) return <Loader label="Loading review…" />;
  const { assetId, seasonYear, homeownerName, inspection, submission, history } = page.data;
  const earlier = history.filter((item) => item.id !== submission.id);

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">{back}<Button variant="secondary" onClick={page.refresh} disabled={page.isValidating}>Refresh evidence</Button></div>
      <header className="space-y-3 [overflow-wrap:anywhere]">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-blue">Department review</p>
        <h1 className="text-3xl font-light text-charcoal">Review Asset {assetId}</h1>
        <p className="text-sm text-city-dark">Season {seasonYear} · Submitted by {homeownerName}</p>
        <SubmissionStatus status={submission.status} />
        <Link href={`/dashboard/hazards/${encodeURIComponent(assetId)}`} className="block text-sm font-semibold text-civic-blue hover:underline">View full property assessment</Link>
      </header>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="original-finding" className="min-w-0 rounded-lg border border-city-light bg-white p-5">
          <h2 id="original-finding" className="text-xl font-semibold text-charcoal">Original crew finding</h2>
          <p className="mt-3 text-sm text-city-dark">Inspected {inspectionDate(inspection.inspectedAt)} · {statusLabel(inspection.status)}</p>
          {inspection.siteAddress ? <p className="mt-2 text-sm text-city-dark [overflow-wrap:anywhere]">{inspection.siteAddress}</p> : null}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-city-dark [overflow-wrap:anywhere]">{inspection.comments || "No inspection comments recorded."}</p>
          {inspection.photos.length ? <CrewPhotoGallery photos={inspection.photos} inspectionNumber={1} comparison /> : <p className="mt-5 text-sm text-muted-foreground">No crew photos recorded for this inspection point.</p>}
        </section>
        <section aria-labelledby="homeowner-evidence" className="min-w-0 rounded-lg border border-city-light bg-white p-5">
          <h2 id="homeowner-evidence" className="text-xl font-semibold text-charcoal">Homeowner completion evidence</h2>
          <p className="mt-3 text-sm text-city-dark">Submitted <time dateTime={submission.createdAt}>{evidenceDate(submission.createdAt)}</time></p>
          {submission.updatedAt ? <p className="mt-1 text-sm text-city-dark">Updated <time dateTime={submission.updatedAt}>{evidenceDate(submission.updatedAt)}</time></p> : null}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-city-dark [overflow-wrap:anywhere]">{submission.comment || "No homeowner comment provided."}</p>
          <ul className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">{submission.photos.map((photo) => <SubmissionPhotoPreview key={photo.id} photo={photo} />)}</ul>
        </section>
      </div>

      {submission.canReview ? <ReviewDecisionForm key={`${submission.id}:${submission.version}`} submission={submission} onReviewed={page.reviewed} /> : (
        <div role="status" className="rounded-lg border border-city-light bg-white p-5 text-sm text-city-dark">
          {submission.reviewedAt ? <><p className="font-semibold">Decision recorded {evidenceDate(submission.reviewedAt)}</p><p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{submission.reviewComment || "The department approved this evidence."}</p></> : <p>This submission is no longer available for review. Open the inbox to review current evidence.</p>}
        </div>
      )}
      {earlier.length ? <SubmissionHistory submissions={earlier} /> : null}
    </div>
  );
}
