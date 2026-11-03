import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PropertySummary } from "@/features/auth/api";

export function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <li className="rounded border border-city-light bg-city-gray p-4">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Asset ID</span>
      <h3 className="mt-1 text-lg font-semibold text-charcoal">{property.assetId}</h3>
      <p className="mt-3 font-semibold text-charcoal">
        {property.latestStatus === "ISSUES" ? "Issues found"
          : property.latestStatus === "NO ISSUES" ? "No issues found" : "Not inspected yet"}
      </p>
      <p className="mt-1 text-sm text-city-dark">
        Latest inspection: {property.latestInspectedAt ? (
          <time dateTime={property.latestInspectedAt}>
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Phoenix" }).format(new Date(property.latestInspectedAt))}
          </time>
        ) : "Date not recorded"}
      </p>
      {property.seasonYear !== null ? <p className="mt-1 text-sm text-city-dark">Season: {property.seasonYear}</p> : null}
      {property.siteAddress ? <p className="mt-3 text-sm text-city-dark">{property.siteAddress}</p> : null}
      {property.seasonYear !== null ? (
        <Link
          href={`/homeowner/properties/${encodeURIComponent(property.assetId)}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-civic-blue hover:underline"
        >
          View assessment
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </li>
  );
}
