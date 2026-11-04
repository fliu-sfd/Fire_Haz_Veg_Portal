import type { CrewPhoto, InspectionPoint, PropertyAssessment } from "@/features/assessments/types";
import { ApiError, apiRequest, apiUrl } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isRecord } from "@/lib/api/guards";

const INVALID_ASSESSMENT = "The assessment service returned invalid property details.";

function invalidAssessment() {
  return new ResponseFormatError(INVALID_ASSESSMENT);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parsePhoto(value: unknown): CrewPhoto {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.file_name !== "string" ||
    typeof value.content_type !== "string" ||
    !value.content_type.startsWith("image/") ||
    !isCount(value.size_bytes)
  ) {
    throw invalidAssessment();
  }
  return {
    id: value.id,
    fileName: value.file_name,
    contentType: value.content_type,
    sizeBytes: value.size_bytes,
  };
}

export function parseInspection(value: unknown): InspectionPoint {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.status !== "string" ||
    !value.status.trim() ||
    !isNullableString(value.comments) ||
    !isNullableString(value.inspected_at) ||
    (value.inspected_at !== null && Number.isNaN(Date.parse(value.inspected_at))) ||
    !isNullableString(value.inspection_type) ||
    !isNullableString(value.site_address) ||
    !Array.isArray(value.photos)
    || !(value.submission_status == null || ["pending_review", "approved", "rejected"].includes(String(value.submission_status)))
  ) {
    throw invalidAssessment();
  }
  return {
    id: value.id,
    status: value.status,
    comments: value.comments,
    inspectedAt: value.inspected_at,
    inspectionType: value.inspection_type,
    siteAddress: value.site_address,
    photos: value.photos.map(parsePhoto),
    submissionStatus: value.submission_status as InspectionPoint["submissionStatus"] ?? null,
  };
}

export function parsePropertyAssessment(value: unknown): PropertyAssessment {
  if (
    !isRecord(value) ||
    typeof value.asset_id !== "string" ||
    !value.asset_id.trim() ||
    !isCount(value.season_year) ||
    !isNullableString(value.site_address) ||
    !Array.isArray(value.inspections)
  ) {
    throw invalidAssessment();
  }
  return {
    assetId: value.asset_id,
    seasonYear: value.season_year,
    siteAddress: value.site_address,
    inspections: value.inspections.map(parseInspection),
  };
}

export async function getPropertyAssessment(assetId: string): Promise<PropertyAssessment> {
  const path = `/assessments/${encodeURIComponent(assetId)}`;
  return parsePropertyAssessment(await apiRequest<unknown>(path));
}

export function crewPhotoUrl(photoId: string): string {
  return apiUrl(`/assessments/photos/${encodeURIComponent(photoId)}`);
}

export function assessmentErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "We could not find an assessment for this property.";
  }
  if (error instanceof ResponseFormatError) return error.message;
  if (!(error instanceof ApiError)) {
    return "We could not reach the assessment service. Check your connection and try again.";
  }
  return "The assessment could not be loaded. Please try again.";
}
