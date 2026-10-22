export type HazardState = "open" | "pending_review" | "closed";

export type PropertyType = "naos" | "residential";

export type AttentionReason = "no_photo" | "no_comment";

export type Hazard = {
  assetId: string;
  state: HazardState;
  propertyType: PropertyType;
  crewCode: string | null;
  inspectedAt: string | null;
  comments: string | null;
  siteAddress: string | null;
  photoCount: number;
  /** Whole days since the latest inspection in Phoenix time; null with no inspection time. */
  ageDays: number | null;
  /** Server-derived; the UI shows these and never works them out itself. */
  attentionReasons: AttentionReason[];
  latitude: number;
  longitude: number;
};

export type HazardSummary = {
  /** Counts under every filter except status. */
  byState: Record<HazardState, number>;
  /** Count under every filter except needs attention. */
  needsAttention: number;
};

export type HazardList = {
  seasonYear: number | null;
  total: number;
  summary: HazardSummary;
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
