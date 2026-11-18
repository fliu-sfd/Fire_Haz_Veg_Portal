/** Route entry point for /dashboard/hazards/[assetId], wiring the page view to its route parameters. */
import type { Metadata } from "next";
import { PropertyAssessmentView } from "@/features/assessments/components/property-assessment-view";

export const metadata: Metadata = {
  title: "Assessment & submissions",
  description: "View original inspection findings and homeowner completion evidence.",
};

export default async function AdminAssessmentPage({ params }: PageProps<"/dashboard/hazards/[assetId]">) {
  const { assetId } = await params;
  return <PropertyAssessmentView assetId={assetId} departmentView />;
}
