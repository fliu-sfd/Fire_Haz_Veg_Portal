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
  if (inspection.status === "ISSUES") {
    return inspection.comments?.trim()
      ? "Complete the work described in the inspection notes below. Contact Fire Prevention if any instruction is unclear."
      : "Contact Fire Prevention for the corrective work required at this inspection point.";
  }
  return "No corrective work is listed for this inspection point. Continue routine vegetation maintenance.";
}
