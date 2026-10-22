"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Focus, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";
import { HazardMarker, type MarkerEvents } from "@/features/hazards/components/hazard-marker";
import { selectedMarkerClass } from "@/features/hazards/components/marker-icon";
import type { Hazard } from "@/features/hazards/types";
import { MAP_TILES } from "@/features/hazards/utils/map-config";
import { hazardBounds, SCOTTSDALE_VIEW } from "@/features/hazards/utils/map-view";
import { cn } from "@/lib/utils";
import styles from "./hazard-map.module.css";

export type HazardMapProps = {
  hazards: Hazard[];
  /** A new value refits the map to the hazards; null leaves the view alone. */
  fitKey: string | null;
};

const controlClass = cn(toolbarButtonClass, "size-10 px-0 shadow-md");

function fitToHazards(map: LeafletMap, hazards: readonly Hazard[]) {
  const bounds = hazardBounds(hazards);
  if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  else map.setView(SCOTTSDALE_VIEW.center, SCOTTSDALE_VIEW.zoom);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HazardMap({ hazards, fitKey }: HazardMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [reduceMotion] = useState(prefersReducedMotion);
  const lastFitKey = useRef<string | null>(null);
  const openMarker = useRef<LeafletMarker | null>(null);
  const openedByKeyboard = useRef(false);

  useEffect(() => {
    if (!map || fitKey === null || fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;
    fitToHazards(map, hazards);
  }, [map, fitKey, hazards]);

  useEffect(() => {
    map?.getContainer().setAttribute("aria-label", "Map. Use the arrow keys to pan and plus or minus to zoom.");
  }, [map]);

  const events = useMemo<MarkerEvents>(
    () => ({
      onKeyboardOpen: () => {
        openedByKeyboard.current = true;
      },
      onOpen: (marker) => {
        openMarker.current = marker;
        marker.getElement()?.classList.add(selectedMarkerClass);
        // React fills the popup after Leaflet opens it, so pan again once the content has its size.
        requestAnimationFrame(() => marker.getPopup()?.update());
        const content = marker.getPopup()?.getElement()?.querySelector<HTMLElement>(".leaflet-popup-content");
        if (openedByKeyboard.current && content) {
          content.tabIndex = -1;
          content.focus();
        }
        openedByKeyboard.current = false;
      },
      onClose: (marker) => {
        const icon = marker.getElement();
        icon?.classList.remove(selectedMarkerClass);
        if (openMarker.current === marker) openMarker.current = null;
        // Closing from inside the popup would drop focus to the page, so hand it back to the marker.
        const active = document.activeElement;
        const popup = marker.getPopup()?.getElement();
        if (icon && (active === document.body || (active && popup?.contains(active)))) icon.focus();
      },
    }),
    [],
  );

  // Leaflet only handles Escape while the map itself has focus, not a marker or the popup.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !map || !openMarker.current) return;
      event.stopPropagation();
      map.closePopup();
    },
    [map],
  );

  const markers = useMemo(
    () => hazards.map((hazard) => <HazardMarker key={hazard.assetId} hazard={hazard} events={events} />),
    [hazards, events],
  );

  return (
    <div className="relative h-full w-full" onKeyDown={handleKeyDown}>
      {/* Before the map in the DOM so Tab reaches the controls ahead of the markers. */}
      <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-md shadow-md">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => map?.zoomIn()}
            className={cn(controlClass, "rounded-none border-b-0 shadow-none")}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => map?.zoomOut()}
            className={cn(controlClass, "rounded-none shadow-none")}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Fit map to results"
          title="Fit to results"
          onClick={() => map && fitToHazards(map, hazards)}
          className={controlClass}
        >
          <Focus aria-hidden="true" className="size-4" />
        </button>
      </div>
      <MapContainer
        ref={setMap}
        center={SCOTTSDALE_VIEW.center}
        zoom={SCOTTSDALE_VIEW.zoom}
        zoomControl={false}
        zoomAnimation={!reduceMotion}
        fadeAnimation={!reduceMotion}
        markerZoomAnimation={!reduceMotion}
        className={styles.map}
      >
        <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} />
        {markers}
      </MapContainer>
    </div>
  );
}
