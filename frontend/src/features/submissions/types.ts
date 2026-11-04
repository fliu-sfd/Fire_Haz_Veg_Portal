export type SubmissionPhoto = {
  id: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png";
  sizeBytes: number;
};

export type Submission = {
  id: string;
  assessmentId: string;
  comment: string | null;
  status: "pending_review" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string | null;
  isOwnSubmission: boolean;
  canEdit: boolean;
  canReview: boolean;
  version: number;
  reviewedAt: string | null;
  reviewComment: string | null;
  photos: SubmissionPhoto[];
};
