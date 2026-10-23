"use client";

import { HazardFilterBar } from "@/features/hazards/components/hazard-filter-bar";
import { HazardSummaryStrip } from "@/features/hazards/components/hazard-summary-strip";
import { HazardLegend } from "@/features/hazards/components/hazard-legend";
import { HazardList } from "@/features/hazards/components/hazard-list";
import { HazardViewToggle } from "@/features/hazards/components/hazard-view-toggle";
import { HazardViewsMenu } from "@/features/hazards/components/hazard-views-menu";
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
import { cn } from "@/lib/utils";

// Above Leaflet's panes (up to z-index 700); the section isolates them from page menus.
const overlayClass = "pointer-events-none absolute z-[1000]";
const panelClass =
  "overflow-hidden rounded-lg border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.08)]";

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
    // From 1024 px the page fills the viewport (the shell's main pads 5rem in total) and the
    // workspace takes whatever height is left, however the filters wrap.
    <div className="space-y-3 lg:flex lg:h-[calc(100dvh-5rem)] lg:flex-col lg:gap-3 lg:space-y-0">
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
          search={page.search}
          dateFilter={page.dateFilter}
          photoFilter={page.photoFilter}
          onPhotoFilterChange={page.setPhotoFilter}
          needsAttention={page.query.needsAttention}
          onToggleNeedsAttention={page.toggleNeedsAttention}
          viewsMenu={
            <HazardViewsMenu
              views={page.views}
              isFull={page.viewsFull}
              canSave={page.canSaveView}
              onApply={page.applyView}
              onSave={page.saveView}
              onDelete={page.deleteView}
            />
          }
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

      {page.isForbidden ? null : (
        <HazardViewToggle view={page.workspaceView} onChange={page.setWorkspaceView} />
      )}

      {/* Both panels stay mounted below 1024 px; the hidden one is only hidden with CSS. */}
      <div className="lg:grid lg:min-h-[22rem] lg:flex-1 lg:basis-0 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-4">
        {page.isForbidden || page.errorMessage ? null : (
          <section
            aria-label="Hazard list"
            className={cn(panelClass, "h-[65dvh] min-h-[22rem] lg:h-full lg:min-h-0", page.workspaceView !== "list" && "hidden lg:block")}
          >
            <HazardList
              rows={page.listRows}
              total={page.hazards.length}
              remaining={page.listRemaining}
              sort={page.sort}
              selectedAssetId={page.selectedAssetId}
              isFirstLoad={!page.hasData}
              isEmpty={page.isEmpty}
              onSortChange={page.setSort}
              onSelect={page.selectFromList}
              onShowMore={page.showMoreRows}
            />
          </section>
        )}
        <section
          aria-label="Hazard map"
          className={cn(
            panelClass,
            "relative isolate h-[65dvh] min-h-[22rem] lg:h-full lg:min-h-0",
            (page.isForbidden || page.errorMessage) && "lg:col-span-2",
            page.workspaceView !== "map" && "hidden lg:block",
          )}
        >
          {page.hasData ? (
            <HazardMapLoader
              hazards={page.hazards}
              fitKey={page.fitKey}
              selectedAssetId={page.selectedAssetId}
              selectRequest={page.selectRequest}
              onSelect={page.onMapSelect}
              isVisible={page.workspaceView === "map"}
            />
          ) : page.isForbidden || page.errorMessage ? null : (
            <MapSkeleton />
          )}

          {page.isUpdating ? (
            <div className={`${overlayClass} top-3 right-3`}>
              <UpdatingPill />
            </div>
          ) : null}
          {/* The legend sits above every Leaflet layer, so it steps aside while a popup is open. */}
          {page.hasData && !page.selectedAssetId ? (
            <div className="absolute top-3 left-3 z-[1000] w-44">
              <HazardLegend />
            </div>
          ) : null}
          {page.missingAssetId && !centered ? (
            <div className={`${overlayClass} bottom-3 left-3 right-16 flex`}>
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
      </div>
      <p role="status" className="sr-only">
        {page.isFirstLoad || page.isUpdating ? "Loading hazards…" : ""}
      </p>
    </div>
  );
}
