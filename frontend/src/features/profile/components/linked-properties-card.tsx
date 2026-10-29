import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropertySummary } from "@/features/auth/api";
import { formatDate } from "@/features/admin/utils/format";
import { ProfileCard } from "@/features/profile/components/profile-card";

type LinkedPropertiesCardProps = {
  items: PropertySummary[] | undefined;
  errorMessage?: string;
  isLoading: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

function statusLabel(status: PropertySummary["latestStatus"]): string {
  if (status === "ISSUES") return "Issues found";
  if (status === "NO ISSUES") return "No issues found";
  return "Not inspected yet";
}

function PropertyList({ items, errorMessage, isLoading, isRetrying, onRetry }: LinkedPropertiesCardProps) {
  if (errorMessage) {
    return (
      <div>
        <FormAlert variant="error" title="We could not load your properties">{errorMessage}</FormAlert>
        <Button className="mt-4" disabled={isRetrying} onClick={onRetry}>
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }
  if (isLoading || !items) {
    return (
      <div role="status" aria-label="Loading your properties" className="grid gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-city-dark">No properties are linked to this account yet.</p>;
  }
  return (
    <ul className="grid gap-3">
      {items.map((property) => (
        <li key={property.assetId} className="rounded border border-city-light bg-city-gray p-4">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Asset ID</span>
          <h3 className="mt-1 text-lg font-semibold text-charcoal">{property.assetId}</h3>
          {property.siteAddress ? <p className="text-sm text-city-dark">{property.siteAddress}</p> : null}
          <p className="mt-3 font-semibold text-charcoal">{statusLabel(property.latestStatus)}</p>
          <p className="mt-1 text-sm text-city-dark">
            Latest inspection:{" "}
            {property.latestInspectedAt ? (
              <time dateTime={property.latestInspectedAt}>
                {formatDate(property.latestInspectedAt, "America/Phoenix")}
              </time>
            ) : (
              "Date not recorded"
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LinkedPropertiesCard(props: LinkedPropertiesCardProps) {
  return (
    <ProfileCard id="profile-properties" title="Your properties">
      <PropertyList {...props} />
      <p className="mt-5 text-sm leading-6 text-city-dark">
        To link another property, contact the Scottsdale Fire Department.
      </p>
      <Link
        href="/homeowner"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-denim underline-offset-4 hover:text-civic-blue hover:underline"
      >
        Go to my homeowner page
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </ProfileCard>
  );
}
