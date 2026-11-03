import { AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AssessmentLoading() {
  return (
    <div role="status" className="space-y-5" aria-label="Loading property assessment">
      <div className="h-32 animate-pulse rounded-lg bg-city-light motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-lg bg-city-light motion-reduce:animate-none" />
    </div>
  );
}

type AssessmentErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export function AssessmentError({ message, isRetrying, onRetry }: AssessmentErrorProps) {
  return (
    <div role="alert" className="rounded-lg border border-fire-red/30 bg-white p-8 text-center shadow-sm">
      <AlertTriangle aria-hidden="true" className="mx-auto size-9 text-fire-red" />
      <h1 className="mt-4 text-2xl font-semibold text-charcoal">We could not load this assessment</h1>
      <p className="mx-auto mt-2 max-w-lg text-city-dark">{message}</p>
      <Button className="mt-6" disabled={isRetrying} onClick={onRetry}>
        {isRetrying ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}

export function NoInspectionPoints() {
  return (
    <div role="status" className="rounded-lg border border-city-light bg-white p-8 text-center">
      <ClipboardList aria-hidden="true" className="mx-auto size-9 text-civic-blue" />
      <h2 className="mt-4 text-xl font-semibold text-charcoal">No inspection details recorded</h2>
      <p className="mx-auto mt-2 max-w-lg text-city-dark">
        This property has an assessment record, but no inspection points are available for the current season.
      </p>
    </div>
  );
}
