import type { Metadata } from "next";
import { ReviewInboxView } from "@/features/reviews/components/review-inbox-view";

export const metadata: Metadata = {
  title: "Review inbox",
  description: "Homeowner completion submissions awaiting department review.",
};

export default async function ReviewInboxPage({ searchParams }: PageProps<"/dashboard/reviews">) {
  const { decision } = await searchParams;
  return <ReviewInboxView decision={decision === "approved" || decision === "rejected" ? decision : undefined} />;
}
