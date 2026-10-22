import type { Hazard, HazardFilterOptions, HazardList, HazardSummary, HazardsQuery } from "@/features/hazards/types";
import {
  hazardsQueryToApiParams,
  isAttentionReason,
  isHazardState,
  isPropertyType,
} from "@/features/hazards/utils/query-params";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isRecord } from "@/lib/api/guards";

const INVALID_LIST = "The hazard service returned an invalid hazard list.";
const INVALID_FILTERS = "The hazard service returned invalid filter options.";

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSeasonYear(value: unknown): value is number | null {
  return value === null || isCount(value);
}

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

function parseHazard(data: unknown): Hazard {
  if (
    !isRecord(data) ||
    typeof data.asset_id !== "string" ||
    !isHazardState(data.state) ||
    !isPropertyType(data.property_type) ||
    !isNullableString(data.crew_code) ||
    !isNullableString(data.inspected_at) ||
    (data.inspected_at !== null && Number.isNaN(Date.parse(data.inspected_at))) ||
    !isNullableString(data.comments) ||
    !isNullableString(data.site_address) ||
    !isCount(data.photo_count) ||
    !(data.age_days === null || isCount(data.age_days)) ||
    !Array.isArray(data.attention_reasons) ||
    !data.attention_reasons.every(isAttentionReason) ||
    !isCoordinate(data.latitude, 90) ||
    !isCoordinate(data.longitude, 180)
  ) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  return {
    assetId: data.asset_id,
    state: data.state,
    propertyType: data.property_type,
    crewCode: data.crew_code,
    inspectedAt: data.inspected_at,
    comments: data.comments,
    siteAddress: data.site_address,
    photoCount: data.photo_count,
    ageDays: data.age_days,
    attentionReasons: data.attention_reasons,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

function parseSummary(data: unknown): HazardSummary {
  if (!isRecord(data) || !isRecord(data.by_state) || !isCount(data.needs_attention)) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  const counts = data.by_state;
  if (!isCount(counts.open) || !isCount(counts.pending_review) || !isCount(counts.closed)) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  return {
    byState: { open: counts.open, pending_review: counts.pending_review, closed: counts.closed },
    needsAttention: data.needs_attention,
  };
}

export function parseHazardList(data: unknown): HazardList {
  if (!isRecord(data) || !isSeasonYear(data.season_year) || !isCount(data.total) || !Array.isArray(data.items)) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  return {
    seasonYear: data.season_year,
    total: data.total,
    summary: parseSummary(data.summary),
    items: data.items.map(parseHazard),
  };
}

export function parseHazardFilterOptions(data: unknown): HazardFilterOptions {
  if (
    !isRecord(data) ||
    !isSeasonYear(data.season_year) ||
    !Array.isArray(data.crews) ||
    !data.crews.every((crew) => typeof crew === "string") ||
    !Array.isArray(data.property_types) ||
    !data.property_types.every(isPropertyType)
  ) {
    throw new ResponseFormatError(INVALID_FILTERS);
  }
  return { seasonYear: data.season_year, crews: data.crews, propertyTypes: data.property_types };
}

export function hazardsPath(query: HazardsQuery): string {
  const search = hazardsQueryToApiParams(query).toString();
  return search ? `/admin/hazards?${search}` : "/admin/hazards";
}

export async function listHazards(query: HazardsQuery): Promise<HazardList> {
  return parseHazardList(await apiRequest<unknown>(hazardsPath(query)));
}

export async function getHazardFilters(): Promise<HazardFilterOptions> {
  return parseHazardFilterOptions(await apiRequest<unknown>("/admin/hazards/filters"));
}
