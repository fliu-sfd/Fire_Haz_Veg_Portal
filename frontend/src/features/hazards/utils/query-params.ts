import type {
  AttentionReason,
  HazardSort,
  HazardState,
  HazardsPageState,
  HazardsQuery,
  PropertyType,
} from "@/features/hazards/types";
import { isCalendarDate } from "@/features/hazards/utils/dates";

export const HAZARD_STATES: readonly HazardState[] = ["open", "pending_review", "closed"];
export const PROPERTY_TYPES: readonly PropertyType[] = ["naos", "residential"];
export const ATTENTION_REASONS: readonly AttentionReason[] = ["no_photo", "no_comment"];
export const HAZARD_SORTS: readonly HazardSort[] = ["oldest", "newest", "asset", "crew"];
// The backend rejects longer values with a 422.
export const CREW_CODE_MAX_LENGTH = 16;
export const SEARCH_MAX_LENGTH = 100;
const ASSET_ID_MAX_LENGTH = 32;

export const DEFAULT_HAZARDS_QUERY: HazardsQuery = {
  states: [...HAZARD_STATES],
  crews: [],
  propertyType: null,
  q: "",
  inspectedFrom: null,
  inspectedTo: null,
  hasPhoto: null,
  needsAttention: false,
};

export const DEFAULT_SORT: HazardSort = "oldest";

export function isHazardState(value: unknown): value is HazardState {
  return HAZARD_STATES.includes(value as HazardState);
}

export function isPropertyType(value: unknown): value is PropertyType {
  return PROPERTY_TYPES.includes(value as PropertyType);
}

export function isAttentionReason(value: unknown): value is AttentionReason {
  return ATTENTION_REASONS.includes(value as AttentionReason);
}

export function isHazardSort(value: unknown): value is HazardSort {
  return HAZARD_SORTS.includes(value as HazardSort);
}

function normalizeStates(states: readonly unknown[]): HazardState[] {
  const picked = HAZARD_STATES.filter((state) => states.includes(state));
  return picked.length > 0 ? picked : [...HAZARD_STATES];
}

function normalizeCrews(crews: readonly string[]): string[] {
  const valid = crews.map((crew) => crew.trim()).filter((crew) => crew && crew.length <= CREW_CODE_MAX_LENGTH);
  return [...new Set(valid)].sort();
}

export function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH).trim();
}

/** Keeps only real dates in order; a reversed range is dropped whole rather than guessed at. */
export function normalizeDateRange(from: unknown, to: unknown): Pick<HazardsQuery, "inspectedFrom" | "inspectedTo"> {
  const inspectedFrom = isCalendarDate(from) ? from : null;
  const inspectedTo = isCalendarDate(to) ? to : null;
  if (inspectedFrom && inspectedTo && inspectedFrom > inspectedTo) return { inspectedFrom: null, inspectedTo: null };
  return { inspectedFrom, inspectedTo };
}

function parseBoolean(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

type ReadableParams = { get(name: string): string | null; getAll(name: string): string[] };

export function parseHazardsQuery(params: ReadableParams): HazardsQuery {
  const propertyType = params.get("property_type");
  return {
    states: normalizeStates(params.getAll("state")),
    crews: normalizeCrews(params.getAll("crew")),
    propertyType: isPropertyType(propertyType) ? propertyType : null,
    q: normalizeSearch(params.get("q") ?? ""),
    ...normalizeDateRange(params.get("inspected_from"), params.get("inspected_to")),
    hasPhoto: parseBoolean(params.get("has_photo")),
    // The UI only ever asks for records that need attention, never for complete ones.
    needsAttention: params.get("needs_attention") === "true",
  };
}

function parseAssetId(value: string | null): string | null {
  const assetId = value?.trim() ?? "";
  return assetId && assetId.length <= ASSET_ID_MAX_LENGTH ? assetId : null;
}

export function parseHazardsPageState(params: ReadableParams): HazardsPageState {
  const sort = params.get("sort");
  return {
    query: parseHazardsQuery(params),
    sort: isHazardSort(sort) ? sort : DEFAULT_SORT,
    asset: parseAssetId(params.get("asset")),
  };
}

export function allStatesSelected(states: readonly HazardState[]): boolean {
  return HAZARD_STATES.every((state) => states.includes(state));
}

/** Backend request params. Defaults are left out; the page URL uses the same names. */
export function hazardsQueryToApiParams(query: HazardsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (!allStatesSelected(query.states)) query.states.forEach((state) => params.append("state", state));
  query.crews.forEach((crew) => params.append("crew", crew));
  if (query.propertyType) params.set("property_type", query.propertyType);
  if (query.q) params.set("q", query.q);
  if (query.inspectedFrom) params.set("inspected_from", query.inspectedFrom);
  if (query.inspectedTo) params.set("inspected_to", query.inspectedTo);
  if (query.hasPhoto !== null) params.set("has_photo", String(query.hasPhoto));
  if (query.needsAttention) params.set("needs_attention", "true");
  return params;
}

/**
 * Page URL params: the filters plus sort and the selected asset. Those two are display
 * state only. They must never reach the API (it rejects unknown params with a 422) or
 * the SWR key, so changing them never refetches.
 */
export function hazardsPageStateToSearchParams(state: HazardsPageState): URLSearchParams {
  const params = hazardsQueryToApiParams(state.query);
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.asset) params.set("asset", state.asset);
  return params;
}

/** At least one status always stays selected, so the last one cannot be turned off. */
export function toggleState(states: readonly HazardState[], state: HazardState): HazardState[] {
  if (!states.includes(state)) return normalizeStates([...states, state]);
  return states.length > 1 ? states.filter((candidate) => candidate !== state) : [...states];
}

export function toggleCrew(crews: readonly string[], crew: string): string[] {
  return crews.includes(crew) ? crews.filter((candidate) => candidate !== crew) : normalizeCrews([...crews, crew]);
}

/** Drops crews the server does not offer (for example from an old or edited link). */
export function withKnownCrews(query: HazardsQuery, known: readonly string[]): HazardsQuery {
  const crews = query.crews.filter((crew) => known.includes(crew));
  return crews.length === query.crews.length ? query : { ...query, crews };
}

export function activeFilterCount(query: HazardsQuery): number {
  return [
    !allStatesSelected(query.states),
    query.crews.length > 0,
    query.propertyType !== null,
    query.q !== "",
    query.inspectedFrom !== null || query.inspectedTo !== null,
    query.hasPhoto !== null,
    query.needsAttention,
  ].filter(Boolean).length;
}

export function hasActiveFilters(query: HazardsQuery): boolean {
  return activeFilterCount(query) > 0;
}
