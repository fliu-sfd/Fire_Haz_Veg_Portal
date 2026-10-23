import type { Hazard } from "@/features/hazards/types";

/** How a hazard was picked: a list click also moves the map to it, a marker click does not. */
export type SelectionSource = "list" | "map";

export type SelectRequest = { assetId: string; seq: number; flyTo: boolean; focusMarker: boolean };

/** The selected asset when settled results do not include it, so the page can say why nothing opened. */
export function missingSelection(asset: string | null, hazards: readonly Pick<Hazard, "assetId">[], isSettled: boolean): string | null {
  if (!asset || !isSettled) return null;
  return hazards.some((hazard) => hazard.assetId === asset) ? null : asset;
}

export function missingAssetMessage(assetId: string): string {
  return `Asset ${assetId} is not in the current results. It may be hidden by the filters.`;
}
