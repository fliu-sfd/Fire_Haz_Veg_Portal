export type AssessmentRequestStatus = "open" | "handled";

export type AssessmentRequest = {
  id: string;
  assetId: string;
  note: string | null;
  requestedAt: string;
  status: AssessmentRequestStatus;
  handledAt: string | null;
};

export type AdminAssessmentRequest = AssessmentRequest & {
  homeownerName: string;
  handledByName: string | null;
};

export type AssessmentRequestList = {
  items: AdminAssessmentRequest[];
  total: number;
  limit: number;
  offset: number;
};
