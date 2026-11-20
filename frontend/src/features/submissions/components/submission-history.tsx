"use client";

import { Check, ChevronDown, Clock3, ImageIcon, Link2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submissionPhotoUrl } from "../api";
import { usePrivatePhoto } from "../hooks/use-private-photo";
import type { Submission, SubmissionPhoto } from "../types";
import { evidenceDate } from "../utils";
import { SubmissionStatus } from "./evidence-status";
import { ReviewDecisionForm } from "@/features/reviews/components/review-decision-form";

export function SubmissionPhotoPreview({ photo }: { photo: SubmissionPhoto }) {
  const { url, error, loading, linkState, copyLink, show } = usePrivatePhoto(photo.id);

  return (
    <li className="min-w-0">
      {url ? (
        <a href={submissionPhotoUrl(photo.id)} target="_blank" rel="noreferrer" className="block min-w-0 overflow-hidden rounded-lg border border-city-light bg-white transition-colors hover:border-denim" aria-label={`Open ${photo.fileName}`}>
          {/* The authenticated API supplies a private browser object URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Submitted evidence: ${photo.fileName}`} className="aspect-[4/3] w-full bg-city-gray object-contain" />
          <span className="block truncate px-2 py-2.5 text-xs text-civic-blue" title={photo.fileName}>{photo.fileName}</span>
        </a>
      ) : (
        <button type="button" onClick={() => void show()} disabled={loading} className="flex min-h-28 w-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-city-light bg-white px-2 py-3 text-center transition-colors hover:border-denim hover:bg-blue-50/30 disabled:opacity-60" aria-label={`View ${photo.fileName}`}>
          {loading ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-civic-blue motion-reduce:animate-none" /> : <ImageIcon aria-hidden="true" className="size-5 text-muted-foreground" strokeWidth={1.5} />}
          <span className="w-full truncate text-xs text-charcoal" title={photo.fileName}>{photo.fileName}</span>
          <span className="text-xs font-medium text-civic-blue">{loading ? "Loading…" : "View photo"}</span>
        </button>
      )}
      <button type="button" onClick={() => void copyLink()} className="mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-civic-blue hover:bg-city-gray" aria-label={`Copy link to ${photo.fileName}`}>
        {linkState === "copied" ? <Check aria-hidden="true" className="size-3.5" /> : <Link2 aria-hidden="true" className="size-3.5" />}
        {linkState === "copied" ? "Link copied" : "Copy photo link"}
      </button>
      {linkState === "copied" ? <span role="status" className="sr-only">Photo link copied. Sign-in and property access are required to view it.</span> : null}
      {linkState === "manual" ? <input readOnly value={submissionPhotoUrl(photo.id)} aria-label={`Photo link for ${photo.fileName}`} onFocus={(event) => event.currentTarget.select()} className="mt-1 w-full min-w-0 rounded border border-city-light p-2 text-base sm:text-xs" /> : null}
      {error ? <p role="alert" className="mt-2 text-xs leading-5 text-fire-red [overflow-wrap:anywhere]">{error}</p> : null}
    </li>
  );
}

export function SubmissionHistory({ submissions, besideForm = false, onEdit, onReviewed }: { submissions: Submission[]; besideForm?: boolean; onEdit?: (submission: Submission) => void; onReviewed?: (submission: Submission) => void }) {
  return (
    <div className={`min-w-0 ${besideForm ? "border-t border-city-light pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-charcoal">Submission history</h3>
        {submissions.length > 0 ? <span className="rounded-full bg-city-gray px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{submissions.length}</span> : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Saved photos and review status. Photo links require sign-in and access to this property.</p>
      {submissions.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-city-gray/70 p-4">
          <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div><p className="text-sm text-city-dark">No submissions yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Submitted photos will appear here for your records.</p></div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {submissions.map((submission, index) => (
            <li key={submission.id} className="min-w-0">
              <details open={index === 0} className="group/submission rounded-lg border border-city-light">
                <summary className="flex min-h-16 cursor-pointer list-none items-start gap-2 rounded-lg p-3 hover:bg-city-gray/50 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <SubmissionStatus status={submission.status} />
                    <time dateTime={submission.createdAt} className="mt-2 block text-xs leading-5 text-muted-foreground">{evidenceDate(submission.createdAt)}</time>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{submission.photos.length} {submission.photos.length === 1 ? "photo" : "photos"}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open/submission:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="min-w-0 px-3 pb-3">
                  <p className="mb-3 text-sm font-semibold text-charcoal">{submission.isOwnSubmission ? "This is your submission" : "Homeowner submission"}</p>
                  {index > 0 && submission.status === "pending_review" ? <p className="mb-3 text-xs leading-5 text-muted-foreground">Earlier evidence — a newer submission supersedes this record.</p> : null}
                  {submission.updatedAt ? <p className="mb-3 text-xs text-muted-foreground">Updated <time dateTime={submission.updatedAt}>{evidenceDate(submission.updatedAt)}</time></p> : null}
                  {submission.comment ? <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-city-dark [overflow-wrap:anywhere]">{submission.comment}</p> : null}
                  {submission.reviewedAt ? (
                    <div className={`mb-4 rounded-md border p-3 ${submission.status === "approved" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className="text-sm font-semibold text-charcoal">Department decision: {submission.status === "approved" ? "Approved" : "Sent back"}</p>
                      <p className="mt-1 text-xs text-city-dark">Reviewed <time dateTime={submission.reviewedAt}>{evidenceDate(submission.reviewedAt)}</time></p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-city-dark [overflow-wrap:anywhere]">{submission.reviewComment || "The department approved your completion evidence."}</p>
                    </div>
                  ) : null}
                  <ul className="grid min-w-0 grid-cols-2 gap-2">
                    {submission.photos.map((photo) => <SubmissionPhotoPreview key={photo.id} photo={photo} />)}
                  </ul>
                  {submission.canEdit && onEdit ? <Button type="button" variant="secondary" className="mt-3 min-h-11" onClick={() => onEdit(submission)}>Edit submission</Button> : null}
                  {submission.canReview && onReviewed ? <ReviewDecisionForm key={`${submission.id}:${submission.version}`} submission={submission} onReviewed={onReviewed} /> : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
