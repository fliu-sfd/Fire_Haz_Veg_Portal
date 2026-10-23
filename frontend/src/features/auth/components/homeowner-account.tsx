"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { useMyProperties } from "@/features/auth/hooks/use-my-properties";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";

function ConnectedProperties({ accountId }: { accountId: string }) {
  const { properties, errorMessage, isLoading, isValidating, isRedirecting, refresh } = useMyProperties(accountId);

  if (isRedirecting) return <p role="status" className="mt-5 text-city-dark">Redirecting…</p>;

  if (errorMessage) {
    return (
      <div className="mt-5">
        <FormAlert variant="error" title="We could not load your properties">
          {errorMessage}
        </FormAlert>
        <Button className="mt-4" disabled={isValidating} onClick={() => void refresh()}>
          {isValidating ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (isLoading || !properties) {
    return <p role="status" className="mt-5 text-city-dark">Loading your properties…</p>;
  }

  if (properties.length === 0) {
    return <p role="status" className="mt-5 text-city-dark">No properties are linked to this account yet.</p>;
  }

  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {properties.map((property) => (
        <li key={property.assetId} className="rounded border border-city-light bg-city-gray p-4">
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
        </li>
      ))}
    </ul>
  );
}

export function HomeownerAccount() {
  const router = useRouter();
  const { account, errorMessage: error } = useCurrentAccount();
  const { status } = useRequireRole("resident", "/dashboard");

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <FormAlert variant="error" title="We could not load your account">{error}</FormAlert>
        <Button onClick={() => router.replace("/sign-in")} className="mt-5">Return to sign in</Button>
      </div>
    );
  }

  if (!account || status !== "allowed") {
    return <p role="status" className="text-center text-city-dark">Loading your property account…</p>;
  }

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.1)]">
      <div className="border-l-4 border-denim p-7 sm:p-12">
        <div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Homeowner portal</p>
            <h1 className="mt-3 text-4xl font-light tracking-tight text-charcoal">Welcome, {account.fullName}</h1>
            <p className="mt-3 text-city-dark">{account.email}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-city-light pt-8">
          <h2 className="text-2xl font-light text-charcoal">Connected properties</h2>
          <p className="mt-2 leading-7 text-city-dark">These Asset IDs were verified against the City assessment data.</p>
          <ConnectedProperties accountId={account.id} />
        </div>
      </div>
    </section>
  );
}
