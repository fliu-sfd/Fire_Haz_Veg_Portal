import type { Hazard } from "@/features/hazards/types";

export type LatLngTuple = [number, number];
export type BoundsTuple = [southWest: LatLngTuple, northEast: LatLngTuple];

export const SCOTTSDALE_VIEW: { center: LatLngTuple; zoom: number } = { center: [33.49, -111.93], zoom: 11 };

type Located = Pick<Hazard, "latitude" | "longitude">;

/** The smallest box around every hazard, or null when there is nothing to fit. */
export function hazardBounds(hazards: readonly Located[]): BoundsTuple | null {
  if (hazards.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const { latitude, longitude } of hazards) {
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
  }
  return [[south, west], [north, east]];
}

/** Lets a revalidated list keep its existing markers when nothing about a hazard changed. */
export function sameHazard(a: Hazard, b: Hazard): boolean {
  return (
    a.assetId === b.assetId &&
    a.state === b.state &&
    a.propertyType === b.propertyType &&
    a.crewCode === b.crewCode &&
    a.inspectedAt === b.inspectedAt &&
    a.comments === b.comments &&
    a.siteAddress === b.siteAddress &&
    a.photoCount === b.photoCount &&
    a.ageDays === b.ageDays &&
    a.attentionReasons.join() === b.attentionReasons.join() &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude
  );
}
