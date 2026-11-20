/** Route entry point for /homeowner/properties/[assetId], wiring the page view to its route parameters. */
import type { Metadata } from "next";
import { PropertyAssessmentView } from "@/features/assessments/components/property-assessment-view";

export const metadata: Metadata = {
  title: "Property assessment",
  description: "Review your property's vegetation assessment findings.",
};

export default async function PropertyAssessmentPage({ params }: PageProps<"/homeowner/properties/[assetId]">) {
  const { assetId } = await params;
  return <PropertyAssessmentView assetId={assetId} />;
}
