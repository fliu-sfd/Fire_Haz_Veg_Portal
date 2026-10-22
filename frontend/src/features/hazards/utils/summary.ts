import type { HazardState, HazardSummary, HazardsQuery } from "@/features/hazards/types";
import { stateLabel } from "@/features/hazards/utils/display";
import { HAZARD_STATES } from "@/features/hazards/utils/query-params";

export type SummaryTile =
  | { kind: "total"; label: string; count: number }
  | { kind: "state"; state: HazardState; label: string; count: number; pressed: boolean }
  | { kind: "attention"; label: string; count: number; pressed: boolean };

export function isOnlyState(states: readonly HazardState[], state: HazardState): boolean {
  return states.length === 1 && states[0] === state;
}

/** A state tile narrows to that state alone; clicking it again brings every state back. */
export function statesAfterTileClick(states: readonly HazardState[], state: HazardState): HazardState[] {
  return isOnlyState(states, state) ? [...HAZARD_STATES] : [state];
}

export function summaryTiles(summary: HazardSummary, total: number, query: HazardsQuery): SummaryTile[] {
  return [
    { kind: "total", label: "Total", count: total },
    ...HAZARD_STATES.map((state): SummaryTile => ({
      kind: "state",
      state,
      label: stateLabel(state),
      count: summary.byState[state],
      pressed: isOnlyState(query.states, state),
    })),
    { kind: "attention", label: "Needs attention", count: summary.needsAttention, pressed: query.needsAttention },
  ];
}
