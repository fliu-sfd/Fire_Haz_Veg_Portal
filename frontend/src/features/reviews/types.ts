import type { InspectionPoint } from "@/features/assessments/types";
import type { Submission } from "@/features/submissions/types";

export type ReviewInboxItem = {
  submissionId: string;
  assessmentId: string;
  assetId: string;
  siteAddress: string | null;
  homeownerName: string;
  createdAt: string;
  updatedAt: string | null;
  photoCount: number;
  inspectedAt: string | null;
  inspectionComments: string | null;
};

export type ReviewInbox = {
  items: ReviewInboxItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ReviewDecision = "approved" | "rejected";

export type ReviewDetail = {
  assetId: string;
  seasonYear: number;
  homeownerName: string;
  inspection: InspectionPoint;
  submission: Submission;
  history: Submission[];
};
