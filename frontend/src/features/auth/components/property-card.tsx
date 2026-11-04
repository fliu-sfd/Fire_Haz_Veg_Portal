import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import type { PropertySummary } from "@/features/auth/api";
import { reviewStateLine } from "@/features/assessments/utils/display";

type PropertyCardProps = {
  property: PropertySummary;
  isSaving: boolean;
  onRemove: () => void;
};

export function PropertyCard({ property, isSaving, onRemove }: PropertyCardProps) {
  const stateLine = reviewStateLine(property.reviewState);

  return (
    <li className="rounded border border-city-light bg-city-gray p-4">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Asset ID</span>
      <h3 className="mt-1 text-lg font-semibold text-charcoal">{property.assetId}</h3>
      <p className="mt-3 font-semibold text-charcoal">
        {property.latestStatus === "ISSUES" ? "Issues found"
          : property.latestStatus === "NO ISSUES" ? "No issues found" : "Not inspected yet"}
      </p>
      {stateLine ? <p className="mt-1 text-sm text-city-dark">{stateLine}</p> : null}
      <p className="mt-1 text-sm text-city-dark">
        Latest inspection: {property.latestInspectedAt ? (
          <time dateTime={property.latestInspectedAt}>
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Phoenix" }).format(new Date(property.latestInspectedAt))}
          </time>
        ) : "Date not recorded"}
      </p>
      {property.seasonYear !== null ? <p className="mt-1 text-sm text-city-dark">Season: {property.seasonYear}</p> : null}
      {property.siteAddress ? <p className="mt-3 text-sm text-city-dark">{property.siteAddress}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {property.seasonYear !== null ? (
          <Link
            href={`/homeowner/properties/${encodeURIComponent(property.assetId)}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-civic-blue hover:underline"
          >
            View assessment
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : <span />}
        <button
          type="button"
          aria-label={`Remove ${property.assetId}`}
          disabled={isSaving}
          onClick={onRemove}
          className="inline-flex min-h-10 items-center gap-1.5 rounded px-2 text-sm font-semibold text-city-dark hover:text-fire-red hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-denim/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Remove
        </button>
      </div>
    </li>
  );
}
