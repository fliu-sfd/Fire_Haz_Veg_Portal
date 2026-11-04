import { apiRequest, apiRequestBlob, apiUrl } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isRecord } from "@/lib/api/guards";
import type { Submission, SubmissionPhoto } from "./types";

const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const validId = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";
const invalid = () => new ResponseFormatError("The service returned invalid photo submission details.");

function parsePhoto(value: unknown): SubmissionPhoto {
  if (!isRecord(value) || !validId(value.id) || typeof value.file_name !== "string" ||
    (value.content_type !== "image/jpeg" && value.content_type !== "image/png") ||
    typeof value.size_bytes !== "number" || !Number.isInteger(value.size_bytes) || value.size_bytes <= 0) throw invalid();
  return { id: value.id, fileName: value.file_name, contentType: value.content_type, sizeBytes: value.size_bytes };
}

export function parseSubmission(value: unknown): Submission {
  if (!isRecord(value) || !validId(value.id) || !validId(value.assessment_id) ||
    !nullableString(value.comment) || !validDate(value.created_at) ||
    !(value.updated_at == null || validDate(value.updated_at)) ||
    typeof value.is_own_submission !== "boolean" || typeof value.can_edit !== "boolean" ||
    typeof value.can_review !== "boolean" || !Number.isInteger(value.version) || Number(value.version) < 1 ||
    !(value.reviewed_at === null || validDate(value.reviewed_at)) || !nullableString(value.review_comment) ||
    !["pending_review", "approved", "rejected"].includes(String(value.status)) ||
    !Array.isArray(value.photos) || value.photos.length < 1 || value.photos.length > 5) throw invalid();
  return {
    id: value.id, assessmentId: value.assessment_id, comment: value.comment,
    status: value.status as Submission["status"], createdAt: value.created_at, photos: value.photos.map(parsePhoto),
    updatedAt: value.updated_at as string | null ?? null,
    isOwnSubmission: value.is_own_submission, canEdit: value.can_edit,
    canReview: value.can_review, version: value.version as number,
    reviewedAt: value.reviewed_at as string | null, reviewComment: value.review_comment,
  };
}

export async function getSubmissions(assessmentId: string): Promise<Submission[]> {
  const data = await apiRequest<unknown>(`/assessments/${encodeURIComponent(assessmentId)}/submissions`);
  if (!Array.isArray(data)) throw invalid();
  const submissions = data.map(parseSubmission);
  if (submissions.some((submission) => submission.assessmentId !== assessmentId)) throw invalid();
  return submissions;
}

export async function submitPhotos(assessmentId: string, files: File[], comment: string): Promise<Submission> {
  const body = new FormData();
  for (const file of files) body.append("photos", file);
  if (comment.trim()) body.append("comment", comment.trim());
  const result = parseSubmission(await apiRequest<unknown>(`/assessments/${encodeURIComponent(assessmentId)}/submissions`, {
    method: "POST", body, signal: AbortSignal.timeout(120_000),
  }));
  if (result.assessmentId !== assessmentId) throw invalid();
  return result;
}

export function getSubmissionPhoto(photoId: string, signal?: AbortSignal): Promise<Blob> {
  return apiRequestBlob(`/submission-photos/${encodeURIComponent(photoId)}`, { signal });
}

export async function updateSubmission(assessmentId: string, submissionId: string, files: File[], comment: string): Promise<Submission> {
  const body = new FormData();
  body.append("comment", comment.trim());
  for (const file of files) body.append("photos", file);
  const result = parseSubmission(await apiRequest<unknown>(`/assessments/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionId)}`, {
    method: "PATCH", body, signal: AbortSignal.timeout(120_000),
  }));
  if (result.id !== submissionId || result.assessmentId !== assessmentId) throw invalid();
  return result;
}

/** Stable private URL; every open rechecks the viewer's session and property access. */
export function submissionPhotoUrl(photoId: string): string {
  return apiUrl(`/submission-photos/${encodeURIComponent(photoId)}`);
}
