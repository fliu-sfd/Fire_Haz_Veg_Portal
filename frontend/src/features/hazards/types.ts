export type HazardState = "open" | "pending_review" | "closed";

export type PropertyType = "naos" | "residential";

export type Hazard = {
  assetId: string;
  state: HazardState;
  propertyType: PropertyType;
  crewCode: string | null;
  inspectedAt: string | null;
  comments: string | null;
  siteAddress: string | null;
  latitude: number;
  longitude: number;
};

export type HazardList = {
  seasonYear: number | null;
  total: number;
  items: Hazard[];
};

export type HazardFilterOptions = {
  seasonYear: number | null;
  crews: string[];
  propertyTypes: PropertyType[];
};

/** Normalized filters: states and crews are unique and in a fixed order, so equal filters share a cache key. */
export type HazardsQuery = {
  states: HazardState[];
  /** Empty means every crew. */
  crews: string[];
  propertyType: PropertyType | null;
};
