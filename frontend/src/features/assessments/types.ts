export type CrewPhoto = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type InspectionPoint = {
  id: string;
  status: string;
  comments: string | null;
  inspectedAt: string | null;
  inspectionType: string | null;
  siteAddress: string | null;
  photos: CrewPhoto[];
  submissionStatus: "pending_review" | "approved" | "rejected" | null;
};

export type PropertyAssessment = {
  assetId: string;
  seasonYear: number;
  siteAddress: string | null;
  inspections: InspectionPoint[];
};
