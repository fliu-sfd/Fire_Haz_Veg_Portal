import type { Hazard, HazardState, HazardsQuery, PropertyType } from "@/features/hazards/types";
import { allStatesSelected } from "@/features/hazards/utils/query-params";

export type StateGlyph = "alert" | "clock" | "check";

type StateStyle = {
  label: string;
  /** A portal color token from globals.css. */
  color: string;
  /** Dark glyphs sit on light fills so the marker keeps 3:1 contrast. */
  glyphColor: "white" | "charcoal";
  glyph: StateGlyph;
};

export const STATE_STYLES: Record<HazardState, StateStyle> = {
  open: { label: "Open", color: "fire-red", glyphColor: "white", glyph: "alert" },
  pending_review: { label: "Pending review", color: "city-orange", glyphColor: "charcoal", glyph: "clock" },
  // success-green is too light for a white glyph, so closed uses its darker shade.
  closed: { label: "Closed", color: "success-dark", glyphColor: "white", glyph: "check" },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  naos: "NAOS",
  residential: "Residential",
};

export function stateLabel(state: HazardState): string {
  return STATE_STYLES[state].label;
}

export function markerName(hazard: Pick<Hazard, "assetId" | "state">): string {
  return `Asset ${hazard.assetId}, ${stateLabel(hazard.state).toLowerCase()}`;
}

/** NAOS points are open space, so a missing street address is expected there. */
export function addressText(hazard: Pick<Hazard, "siteAddress" | "propertyType">): string | null {
  if (hazard.siteAddress) return hazard.siteAddress;
  return hazard.propertyType === "naos" ? "Community NAOS" : null;
}

export function formatInspectedDate(iso: string | null, timeZone?: string): string {
  if (!iso) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(iso));
}

export function resultSummary(shown: number, total: number): string {
  if (total === 0) return "No hazards to show";
  if (shown < total) return `Showing ${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} hazards`;
  return `Showing ${total.toLocaleString("en-US")} ${total === 1 ? "hazard" : "hazards"}`;
}

export type FilterChip =
  | { id: string; label: string; kind: "state" | "propertyType" }
  | { id: string; label: string; kind: "crew"; crew: string };

export function filterChips(query: HazardsQuery): FilterChip[] {
  const chips: FilterChip[] = [];
  if (!allStatesSelected(query.states)) {
    chips.push({ id: "state", kind: "state", label: `Status: ${query.states.map(stateLabel).join(", ")}` });
  }
  for (const crew of query.crews) {
    chips.push({ id: `crew:${crew}`, kind: "crew", crew, label: `Station/Shift: ${crew}` });
  }
  if (query.propertyType) {
    chips.push({
      id: "property_type",
      kind: "propertyType",
      label: `Property type: ${PROPERTY_TYPE_LABELS[query.propertyType]}`,
    });
  }
  return chips;
}

/** A filter button names what it is narrowing to, so the active filters read at a glance. */
export function selectionLabel(name: string, selected: readonly string[], isAll: boolean): string {
  if (isAll || selected.length === 0) return name;
  return selected.length === 1 ? `${name}: ${selected[0]}` : `${name}: ${selected.length} selected`;
}
