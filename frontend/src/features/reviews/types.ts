export type ReviewInboxItem = {
  submissionId: string;
  assessmentId: string;
  assetId: string;
  siteAddress: string | null;
  homeownerName: string;
  createdAt: string;
  updatedAt: string | null;
  photoCount: number;
};

export type ReviewInbox = {
  items: ReviewInboxItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ReviewDecision = "approved" | "rejected";
