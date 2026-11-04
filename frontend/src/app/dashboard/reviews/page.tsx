import type { Metadata } from "next";
import { ReviewInboxView } from "@/features/reviews/components/review-inbox-view";

export const metadata: Metadata = {
  title: "Review inbox",
  description: "Homeowner completion submissions awaiting department review.",
};

export default function ReviewInboxPage() {
  return <ReviewInboxView />;
}
