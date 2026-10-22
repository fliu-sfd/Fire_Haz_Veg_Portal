"use client";

import { HazardFilterBar } from "@/features/hazards/components/hazard-filter-bar";
import { HazardSummaryStrip } from "@/features/hazards/components/hazard-summary-strip";
import { HazardLegend } from "@/features/hazards/components/hazard-legend";
import { HazardMapLoader } from "@/features/hazards/components/hazard-map-loader";
import {
  HazardsAccessRequired,
  HazardsError,
  MissingAssetNotice,
  NoHazardsRecorded,
  NoMatchingHazards,
  UpdatingPill,
} from "@/features/hazards/components/hazards-states";
import { MapSkeleton } from "@/features/hazards/components/map-skeleton";
import { useHazardsPage } from "@/features/hazards/hooks/use-hazards-page";

// Above Leaflet's panes (up to z-index 700); the section isolates them from page menus.
const overlayClass = "pointer-events-none absolute z-[1000]";

export function HazardsView() {
  const page = useHazardsPage();

  // Render nothing admin-specific until the role check passes, so a redirect never flashes the map.
  if (page.access !== "allowed") {
    return <p role="status" className="text-city-dark">Checking access…</p>;
  }

  const centered = page.isForbidden ? (
    <HazardsAccessRequired />
  ) : page.errorMessage ? (
    <HazardsError message={page.errorMessage} isRetrying={page.isUpdating} onRetry={page.refresh} />
  ) : page.isEmpty ? (
    page.filtersActive ? <NoMatchingHazards onClearFilters={page.clearFilters} /> : <NoHazardsRecorded />
  ) : null;

  return (
    <div className="space-y-3">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">Hazard map</h1>
        <p className="mt-2 text-city-dark">See where vegetation hazards are open, and filter by status, station or property type.</p>
      </header>

      {page.isForbidden ? null : (
        <HazardSummaryStrip
          tiles={page.summaryTiles}
          onStateClick={page.onStateTile}
          onAttentionClick={page.toggleNeedsAttention}
        />
      )}

      {page.isForbidden ? null : (
        <HazardFilterBar
          states={page.query.states}
          crews={page.query.crews}
          crewOptions={page.crewOptions}
          propertyType={page.query.propertyType}
          propertyTypeOptions={page.propertyTypeOptions}
          chips={page.chips}
          activeCount={page.activeCount}
          onToggleStatus={page.toggleStatus}
          onToggleCrew={page.toggleCrew}
          onResetCrews={page.resetCrews}
          onPropertyTypeChange={page.setPropertyType}
          onRemoveChip={page.removeChip}
          onClearFilters={page.clearFilters}
          summary={
            <>
              <p aria-live="polite" aria-atomic="true">
                {page.summary}
                {page.summary && page.seasonYear ? ` from the ${page.seasonYear} season` : ""}
              </p>
              {page.isCapped ? (
                <p className="font-semibold text-fire-red">Only the first results are on the map. Narrow the filters to see the rest.</p>
              ) : null}
            </>
          }
        />
      )}

      <section
        aria-label="Hazard map"
        className="relative isolate h-[60dvh] min-h-[22rem] overflow-hidden rounded-lg border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.08)] md:h-[calc(100dvh-18rem)] md:min-h-[28rem]"
      >
        {page.hasData ? (
          <HazardMapLoader
            hazards={page.hazards}
            fitKey={page.fitKey}
            selectedAssetId={page.selectedAssetId}
            selectRequest={page.selectRequest}
            onSelect={page.onMapSelect}
          />
        ) : page.isForbidden || page.errorMessage ? null : (
          <MapSkeleton />
        )}

        {page.isUpdating ? (
          <div className={`${overlayClass} top-3 right-3`}>
            <UpdatingPill />
          </div>
        ) : null}
        {page.hasData ? (
          <div className="absolute top-3 left-3 z-[1000] w-44">
            <HazardLegend />
          </div>
        ) : null}
        {page.missingAssetId && !centered ? (
          <div className={`${overlayClass} inset-x-3 top-16 flex justify-center sm:top-3`}>
            <MissingAssetNotice
              assetId={page.missingAssetId}
              onClearFilters={page.clearFilters}
              onDismiss={page.dismissMissingAsset}
            />
          </div>
        ) : null}
        {centered ? (
          <div className={`${overlayClass} inset-0 flex items-center justify-center bg-white/40 p-4`}>{centered}</div>
        ) : null}
      </section>
      <p role="status" className="sr-only">
        {page.isFirstLoad || page.isUpdating ? "Loading hazards…" : ""}
      </p>
    </div>
  );
}
