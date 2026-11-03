import { CalendarDays, CircleCheck, CircleAlert, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrewPhotoGallery } from "@/features/assessments/components/crew-photo-gallery";
import { AssessmentEvidence } from "@/features/submissions/components/assessment-evidence";
import type { InspectionPoint } from "@/features/assessments/types";
import { inspectionDate, inspectionProgress, nextStep, statusLabel } from "@/features/assessments/utils/display";

type InspectionCardProps = {
  inspection: InspectionPoint;
  number: number;
  departmentView?: boolean;
};

export function InspectionCard({ inspection, number, departmentView = false }: InspectionCardProps) {
  const needsAction = inspection.status === "ISSUES";
  const progress = inspectionProgress(inspection);
  const waiting = progress === "pending_review";
  const actionRequired = progress === "action_needed";
  const StatusIcon = actionRequired ? CircleAlert : CircleCheck;
  const label = waiting ? (departmentView ? "Pending review" : "Submitted")
    : progress === "approved" ? "Approved by department" : statusLabel(inspection.status);

  return (
    <article className={`min-w-0 overflow-hidden rounded-lg border bg-white shadow-sm ${actionRequired ? "border-city-orange/60" : "border-city-light"}`}>
      <div className={`border-l-4 p-5 sm:p-6 ${actionRequired ? "border-city-orange" : waiting && departmentView ? "border-denim" : "border-success-green"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Inspection point {number}</p>
            <h3 className="mt-2 text-xl font-semibold text-charcoal">
              {inspection.inspectionType?.trim() || "Vegetation assessment"}
            </h3>
          </div>
          <Badge
            variant={actionRequired ? "destructive" : "secondary"}
            className={actionRequired ? "bg-city-orange text-charcoal" : waiting && departmentView ? "bg-blue-50 text-civic-blue" : "bg-success-green text-white"}
          >
            <StatusIcon aria-hidden="true" />
            {label}
          </Badge>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm text-city-dark">
          <CalendarDays aria-hidden="true" className="size-4 text-civic-blue" />
          <span>Inspected {inspectionDate(inspection.inspectedAt)}</span>
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-md bg-city-gray p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <ClipboardCheck aria-hidden="true" className="size-4 text-civic-blue" />
              Inspection notes
            </h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-city-dark [overflow-wrap:anywhere]">
              {inspection.comments?.trim() || "No comments were recorded for this inspection point."}
            </p>
          </section>
          <section className={`rounded-md p-4 ${actionRequired ? "bg-orange-50" : waiting && departmentView ? "bg-blue-50" : "bg-lime-50"}`}>
            <h4 className="text-sm font-semibold text-charcoal">Next step</h4>
            <p className="mt-2 text-sm leading-6 text-city-dark">{nextStep(inspection)}</p>
          </section>
        </div>

        <CrewPhotoGallery photos={inspection.photos} inspectionNumber={number} />
        <AssessmentEvidence assessmentId={inspection.id} needsAction={needsAction} />
      </div>
    </article>
  );
}
