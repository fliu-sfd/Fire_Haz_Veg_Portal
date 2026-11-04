import type { Metadata } from "next";
import { AssessmentRequestsView } from "@/features/assessment-requests/components/assessment-requests-view";

export const metadata: Metadata = {
  title: "Assessment requests",
  description: "Review full home assessment requests from homeowners.",
};

export default function AssessmentRequestsPage() {
  return <AssessmentRequestsView />;
}
