import type { InspectionPoint, PropertyAssessment } from "@/features/assessments/types";

export function hasIssues(assessment: PropertyAssessment): boolean {
  return assessment.inspections.some((inspection) => inspection.status === "ISSUES");
}

export function statusLabel(status: string): string {
  if (status === "ISSUES") return "Action needed";
  if (status === "NO ISSUES") return "No issues found";
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function inspectionDate(value: string | null): string {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

export function nextStep(inspection: InspectionPoint): string {
  if (inspection.submissionStatus === "pending_review") {
    return "Completion photos have been submitted. The homeowner's submission step is complete; department verification is pending.";
  }
  if (inspection.submissionStatus === "approved") {
    return "The department approved the submitted evidence. The original crew finding is preserved below for reference.";
  }
  if (inspection.submissionStatus === "rejected") {
    return "The department needs more work or evidence. Review the finding and submit updated completion photos.";
  }
  if (inspection.status === "ISSUES") {
    return inspection.comments?.trim()
      ? "Complete the work described in the inspection notes below. Contact Fire Prevention if any instruction is unclear."
      : "Contact Fire Prevention for the corrective work required at this inspection point.";
  }
  return "No corrective work is listed for this inspection point. Continue routine vegetation maintenance.";
}

export function inspectionProgress(inspection: InspectionPoint) {
  if (inspection.status !== "ISSUES") return "no_issues";
  if (inspection.submissionStatus === "pending_review") return "pending_review";
  if (inspection.submissionStatus === "approved") return "approved";
  return "action_needed";
}

export function propertyProgress(assessment: PropertyAssessment) {
  const issues = assessment.inspections.filter((point) => point.status === "ISSUES");
  if (issues.length === 0) return "no_issues";
  if (issues.some((point) => inspectionProgress(point) === "action_needed")) return "action_needed";
  if (issues.some((point) => inspectionProgress(point) === "pending_review")) return "pending_review";
  return "approved";
}
