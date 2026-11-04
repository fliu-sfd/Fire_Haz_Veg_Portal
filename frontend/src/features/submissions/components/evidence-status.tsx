import { CircleAlert, CircleCheck, Clock3 } from "lucide-react";
import type { Submission } from "../types";

const base = "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";

export function InspectionStatus({ status }: { status: string | null }) {
  if (status === "ISSUES") {
    return <span className={`${base} bg-amber-50 text-amber-900`}><CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />Issues found</span>;
  }
  if (status === "NO ISSUES") {
    return <span className={`${base} bg-emerald-50 text-emerald-800`}><CircleCheck aria-hidden="true" className="size-3.5 shrink-0" />No issues found</span>;
  }
  return <span className={`${base} bg-city-gray text-muted-foreground`}>{status || "Not inspected"}</span>;
}

const statuses = {
  pending_review: { label: "Pending review", style: "bg-blue-50 text-civic-blue", icon: Clock3 },
  approved: { label: "Approved", style: "bg-emerald-50 text-emerald-800", icon: CircleCheck },
  rejected: { label: "More evidence needed", style: "bg-amber-50 text-amber-900", icon: CircleAlert },
};

export function SubmissionStatus({ status }: { status: Submission["status"] }) {
  const { label, style, icon: Icon } = statuses[status];
  return <span className={`${base} ${style}`}><Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}</span>;
}
