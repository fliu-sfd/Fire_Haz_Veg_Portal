import type {
  AdminAssessmentRequest,
  AssessmentRequest,
  AssessmentRequestList,
  AssessmentRequestStatus,
} from "@/features/assessment-requests/types";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isOptionalDate, isRecord } from "@/lib/api/guards";

const INVALID_RESPONSE = "The assessment request service returned invalid details.";

function invalidResponse() {
  return new ResponseFormatError(INVALID_RESPONSE);
}

function isStatus(value: unknown): value is AssessmentRequestStatus {
  return value === "open" || value === "handled";
}

function parseRequest(value: unknown): AssessmentRequest {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.asset_id !== "string" ||
    !(value.note === null || typeof value.note === "string") ||
    typeof value.requested_at !== "string" ||
    Number.isNaN(Date.parse(value.requested_at)) ||
    !isStatus(value.status) ||
    !isOptionalDate(value.handled_at)
  ) {
    throw invalidResponse();
  }
  return {
    id: value.id,
    assetId: value.asset_id,
    note: value.note,
    requestedAt: value.requested_at,
    status: value.status,
    handledAt: value.handled_at,
  };
}

function parseAdminRequest(value: unknown): AdminAssessmentRequest {
  const request = parseRequest(value);
  if (
    !isRecord(value) ||
    typeof value.homeowner_name !== "string" ||
    !value.homeowner_name.trim() ||
    !(value.handled_by_name === null || typeof value.handled_by_name === "string")
  ) {
    throw invalidResponse();
  }
  return {
    ...request,
    homeownerName: value.homeowner_name,
    handledByName: value.handled_by_name,
  };
}

export function parseAssessmentRequestList(value: unknown): AssessmentRequestList {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !isCount(value.total) ||
    !isCount(value.limit) ||
    value.limit < 1 ||
    !isCount(value.offset)
  ) {
    throw invalidResponse();
  }
  return {
    items: value.items.map(parseAdminRequest),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

export async function getOpenAssessmentRequest(assetId: string): Promise<AssessmentRequest | null> {
  const value = await apiRequest<unknown>(
    `/residents/me/properties/${encodeURIComponent(assetId)}/assessment-requests/open`,
  );
  return value === null ? null : parseRequest(value);
}

export async function createAssessmentRequest(assetId: string, note: string): Promise<AssessmentRequest> {
  const value = await apiRequest<unknown>(
    `/residents/me/properties/${encodeURIComponent(assetId)}/assessment-requests`,
    { method: "POST", body: JSON.stringify({ note: note.trim() || null }) },
  );
  return parseRequest(value);
}

export async function listAssessmentRequests(
  status: AssessmentRequestStatus | null,
  offset = 0,
): Promise<AssessmentRequestList> {
  const params = new URLSearchParams({ limit: "25", offset: String(offset) });
  if (status) params.set("status", status);
  return parseAssessmentRequestList(
    await apiRequest<unknown>(`/admin/assessment-requests?${params.toString()}`),
  );
}

export async function markAssessmentRequestHandled(id: string): Promise<AdminAssessmentRequest> {
  return parseAdminRequest(
    await apiRequest<unknown>(`/admin/assessment-requests/${encodeURIComponent(id)}/handle`, {
      method: "POST",
    }),
  );
}
