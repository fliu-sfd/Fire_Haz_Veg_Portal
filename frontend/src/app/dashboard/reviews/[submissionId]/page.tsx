import type { Metadata } from "next";
import { ReviewDetailView } from "@/features/reviews/components/review-detail-view";

export const metadata: Metadata = {
  title: "Review completion evidence",
  description: "Compare crew and homeowner photos and record a review decision.",
};

export default async function ReviewDetailPage({ params }: PageProps<"/dashboard/reviews/[submissionId]">) {
  const { submissionId } = await params;
  return <ReviewDetailView submissionId={submissionId} />;
}
