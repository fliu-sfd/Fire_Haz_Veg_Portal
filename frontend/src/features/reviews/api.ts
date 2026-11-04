import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isRecord } from "@/lib/api/guards";
import { parseSubmission } from "@/features/submissions/api";
import type { Submission } from "@/features/submissions/types";
import type { ReviewDecision, ReviewInbox, ReviewInboxItem } from "./types";

const validText = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const invalid = () => new ResponseFormatError("The review service returned invalid submission details.");

export async function pendingReviewCount(): Promise<number> {
  const data = await apiRequest<unknown>("/admin/submissions/count");
  if (!isRecord(data) || !isCount(data.pending)) throw invalid();
  return data.pending;
}

export function parseReviewInbox(data: unknown): ReviewInbox {
  if (!isRecord(data) || !Array.isArray(data.items) || !isCount(data.total) || !isCount(data.offset) || !isCount(data.limit) || data.limit < 1) throw invalid();
  const items = data.items.map((item: unknown): ReviewInboxItem => {
    if (!isRecord(item) || !validText(item.submission_id) || !validText(item.assessment_id) ||
      !validText(item.asset_id) || !validText(item.homeowner_name) ||
      !(item.site_address === null || typeof item.site_address === "string") ||
      !validDate(item.created_at) || !(item.updated_at === null || validDate(item.updated_at)) ||
      !isCount(item.photo_count)) throw invalid();
    return {
      submissionId: item.submission_id, assessmentId: item.assessment_id, assetId: item.asset_id,
      siteAddress: item.site_address, homeownerName: item.homeowner_name,
      createdAt: item.created_at, updatedAt: item.updated_at, photoCount: item.photo_count,
    };
  });
  return { items, total: data.total, limit: data.limit, offset: data.offset };
}

export async function getReviewInbox(offset = 0): Promise<ReviewInbox> {
  return parseReviewInbox(await apiRequest<unknown>(`/admin/submissions?limit=25&offset=${offset}`));
}

export async function saveReview(submission: Submission, decision: ReviewDecision, comment: string): Promise<Submission> {
  const result = parseSubmission(await apiRequest<unknown>(`/admin/submissions/${encodeURIComponent(submission.id)}/review`, {
    method: "POST", body: JSON.stringify({ decision, comment: comment.trim() || null, expected_version: submission.version }),
  }));
  if (result.id !== submission.id || result.assessmentId !== submission.assessmentId) throw invalid();
  return result;
}
