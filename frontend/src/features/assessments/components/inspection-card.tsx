import { CalendarDays, CircleCheck, CircleAlert, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrewPhotoGallery } from "@/features/assessments/components/crew-photo-gallery";
import type { InspectionPoint } from "@/features/assessments/types";
import { inspectionDate, nextStep, statusLabel } from "@/features/assessments/utils/display";

type InspectionCardProps = {
  inspection: InspectionPoint;
  number: number;
};

export function InspectionCard({ inspection, number }: InspectionCardProps) {
  const needsAction = inspection.status === "ISSUES";
  const StatusIcon = needsAction ? CircleAlert : CircleCheck;

  return (
    <article className={`overflow-hidden rounded-lg border bg-white shadow-sm ${needsAction ? "border-city-orange/60" : "border-city-light"}`}>
      <div className={`border-l-4 p-5 sm:p-6 ${needsAction ? "border-city-orange" : "border-success-green"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Inspection point {number}</p>
            <h3 className="mt-2 text-xl font-semibold text-charcoal">
              {inspection.inspectionType?.trim() || "Vegetation assessment"}
            </h3>
          </div>
          <Badge
            variant={needsAction ? "destructive" : "secondary"}
            className={needsAction ? "bg-city-orange text-charcoal" : "bg-success-green text-white"}
          >
            <StatusIcon aria-hidden="true" />
            {statusLabel(inspection.status)}
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
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-city-dark">
              {inspection.comments?.trim() || "No comments were recorded for this inspection point."}
            </p>
          </section>
          <section className={`rounded-md p-4 ${needsAction ? "bg-orange-50" : "bg-lime-50"}`}>
            <h4 className="text-sm font-semibold text-charcoal">Next step</h4>
            <p className="mt-2 text-sm leading-6 text-city-dark">{nextStep(inspection)}</p>
          </section>
        </div>

        <CrewPhotoGallery photos={inspection.photos} inspectionNumber={number} />
      </div>
    </article>
  );
}
