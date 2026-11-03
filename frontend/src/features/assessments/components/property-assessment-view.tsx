"use client";

import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AssessmentError, AssessmentLoading, NoInspectionPoints } from "@/features/assessments/components/assessment-states";
import { InspectionCard } from "@/features/assessments/components/inspection-card";
import { usePropertyAssessment } from "@/features/assessments/hooks/use-property-assessment";
import { hasIssues } from "@/features/assessments/utils/display";

export function PropertyAssessmentView({ assetId }: { assetId: string }) {
  const { assessment, errorMessage, isLoading, isValidating, isRedirecting, refresh } = usePropertyAssessment(assetId);

  if (isRedirecting) return <p role="status" className="text-city-dark">Redirecting…</p>;
  if (errorMessage) {
    return <AssessmentError message={errorMessage} isRetrying={isValidating} onRetry={() => void refresh()} />;
  }
  if (isLoading || !assessment) return <AssessmentLoading />;

  const needsAction = hasIssues(assessment);
  const StatusIcon = needsAction ? CircleAlert : CircleCheck;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/homeowner" className="inline-flex items-center gap-2 text-sm font-semibold text-civic-blue hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to my properties
      </Link>

      <header className="mt-5 overflow-hidden rounded-lg border border-city-light bg-white shadow-sm">
        <div className={`border-l-4 p-6 sm:p-8 ${needsAction ? "border-city-orange" : "border-success-green"}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Property assessment</p>
              <h1 className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
                {assessment.siteAddress || `Asset ${assessment.assetId}`}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-city-dark">
                <span className="flex items-center gap-2">
                  <Home aria-hidden="true" className="size-4 text-civic-blue" />
                  Asset ID: {assessment.assetId}
                </span>
                <span>Season: {assessment.seasonYear}</span>
              </div>
              {assessment.siteAddress ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-city-dark">
                  <MapPin aria-hidden="true" className="size-4 text-civic-blue" />
                  {assessment.siteAddress}
                </p>
              ) : null}
            </div>
            <Badge
              variant={needsAction ? "destructive" : "secondary"}
              className={`px-3 py-1.5 text-sm ${needsAction ? "bg-city-orange text-charcoal" : "bg-success-green text-white"}`}
            >
              <StatusIcon aria-hidden="true" />
              {needsAction ? "Work needed" : "No issues found"}
            </Badge>
          </div>
          <p className="mt-6 max-w-3xl leading-7 text-city-dark">
            {needsAction
              ? "Review each inspection point below to see what needs attention. Crew notes and available photos are included with the finding."
              : "The latest inspection did not identify vegetation issues. Continue regular property maintenance."}
          </p>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="inspection-findings">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">Latest season</p>
            <h2 id="inspection-findings" className="mt-1 text-2xl font-light text-charcoal">Inspection findings</h2>
          </div>
          <p className="text-sm text-city-dark">
            {assessment.inspections.length} {assessment.inspections.length === 1 ? "point" : "points"}
          </p>
        </div>

        {assessment.inspections.length === 0 ? <NoInspectionPoints /> : (
          <div className="space-y-5">
            {assessment.inspections.map((inspection, index) => (
              <InspectionCard key={inspection.id} inspection={inspection} number={index + 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
