import type { HazardState, HazardsQuery, PropertyType } from "@/features/hazards/types";

export const HAZARD_STATES: readonly HazardState[] = ["open", "pending_review", "closed"];
export const PROPERTY_TYPES: readonly PropertyType[] = ["naos", "residential"];
// The backend rejects longer crew codes with a 422.
export const CREW_CODE_MAX_LENGTH = 16;

export const DEFAULT_HAZARDS_QUERY: HazardsQuery = {
  states: [...HAZARD_STATES],
  crews: [],
  propertyType: null,
};

export function isHazardState(value: unknown): value is HazardState {
  return HAZARD_STATES.includes(value as HazardState);
}

export function isPropertyType(value: unknown): value is PropertyType {
  return PROPERTY_TYPES.includes(value as PropertyType);
}

function normalizeStates(states: readonly unknown[]): HazardState[] {
  const picked = HAZARD_STATES.filter((state) => states.includes(state));
  return picked.length > 0 ? picked : [...HAZARD_STATES];
}

function normalizeCrews(crews: readonly string[]): string[] {
  const valid = crews.map((crew) => crew.trim()).filter((crew) => crew && crew.length <= CREW_CODE_MAX_LENGTH);
  return [...new Set(valid)].sort();
}

type ReadableParams = { get(name: string): string | null; getAll(name: string): string[] };

export function parseHazardsQuery(params: ReadableParams): HazardsQuery {
  const propertyType = params.get("property_type");
  return {
    states: normalizeStates(params.getAll("state")),
    crews: normalizeCrews(params.getAll("crew")),
    propertyType: isPropertyType(propertyType) ? propertyType : null,
  };
}

export function allStatesSelected(states: readonly HazardState[]): boolean {
  return HAZARD_STATES.every((state) => states.includes(state));
}

/** Shared by the page URL and the API request: same names, defaults left out. */
export function hazardsQueryToParams(query: HazardsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (!allStatesSelected(query.states)) query.states.forEach((state) => params.append("state", state));
  query.crews.forEach((crew) => params.append("crew", crew));
  if (query.propertyType) params.set("property_type", query.propertyType);
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
  return (allStatesSelected(query.states) ? 0 : 1) + (query.crews.length > 0 ? 1 : 0) + (query.propertyType ? 1 : 0);
}

export function hasActiveFilters(query: HazardsQuery): boolean {
  return activeFilterCount(query) > 0;
}
