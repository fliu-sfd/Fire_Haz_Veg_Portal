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
import type { SelectRequest } from "@/features/hazards/utils/selection";
import { cn } from "@/lib/utils";
import styles from "./hazard-map.module.css";

export type HazardMapProps = {
  hazards: Hazard[];
  /** A new value refits the map to the hazards; null leaves the view alone. */
  fitKey: string | null;
  /** The hazard whose popup is open, from the URL. */
  selectedAssetId: string | null;
  /** A list pick: move to that marker and open it, without refitting. */
  selectRequest: SelectRequest | null;
  /** Called with the asset whose popup opened, or null when it closed. */
  onSelect: (assetId: string | null) => void;
};

const SELECTED_ZOOM = 15;

const controlClass = cn(toolbarButtonClass, "size-10 px-0 shadow-md");

function fitToHazards(map: LeafletMap, hazards: readonly Hazard[]) {
  const bounds = hazardBounds(hazards);
  if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  else map.setView(SCOTTSDALE_VIEW.center, SCOTTSDALE_VIEW.zoom);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HazardMap({ hazards, fitKey, selectedAssetId, selectRequest, onSelect }: HazardMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [reduceMotion] = useState(prefersReducedMotion);
  const lastFitKey = useRef<string | null>(null);
  const openMarker = useRef<LeafletMarker | null>(null);
  const openedByKeyboard = useRef(false);
  const markersById = useRef(new Map<string, LeafletMarker>());
  // The asset a list pick is flying to; its popup waits for the flight to end.
  const flyingTo = useRef<string | null>(null);
  // Read from marker events, which are created once so markers never rebuild.
  const selected = useRef(selectedAssetId);
  const reportSelection = useRef(onSelect);
  useEffect(() => {
    selected.current = selectedAssetId;
    reportSelection.current = onSelect;
  }, [selectedAssetId, onSelect]);

  useEffect(() => {
    if (!map || fitKey === null || fitKey === lastFitKey.current) return;
    const isFirstFit = lastFitKey.current === null;
    lastFitKey.current = fitKey;
    // A shared link to one hazard opens on that hazard rather than the whole result set.
    const target = isFirstFit ? hazards.find((hazard) => hazard.assetId === selected.current) : undefined;
    if (target) map.setView([target.latitude, target.longitude], SELECTED_ZOOM);
    else fitToHazards(map, hazards);
  }, [map, fitKey, hazards]);

  // Back, Forward or a link changed the selection: open or close to match, without moving the map.
  useEffect(() => {
    if (!map) return;
    if (!selectedAssetId) {
      if (openMarker.current) map.closePopup();
      return;
    }
    const marker = markersById.current.get(selectedAssetId);
    if (marker && openMarker.current !== marker && flyingTo.current !== selectedAssetId) marker.openPopup();
  }, [map, selectedAssetId]);

  useEffect(() => {
    if (!map || !selectRequest) return;
    const marker = markersById.current.get(selectRequest.assetId);
    if (!marker) return;
    const open = () => {
      flyingTo.current = null;
      if (openMarker.current !== marker) marker.openPopup();
      if (selectRequest.focusMarker) marker.getElement()?.focus();
    };
    const target = marker.getLatLng();
    const zoom = Math.max(map.getZoom(), SELECTED_ZOOM);
    if (map.getCenter().equals(target) && map.getZoom() === zoom) {
      open();
      return;
    }
    flyingTo.current = selectRequest.assetId;
    map.once("moveend", open);
    if (reduceMotion) map.setView(target, zoom);
    else map.flyTo(target, zoom, { duration: 0.6 });
    return () => {
      map.off("moveend", open);
      flyingTo.current = null;
    };
  }, [map, selectRequest, reduceMotion]);

  useEffect(() => {
    map?.getContainer().setAttribute("aria-label", "Map. Use the arrow keys to pan and plus or minus to zoom.");
  }, [map]);

  const events = useMemo<MarkerEvents>(
    () => ({
      onAdd: (assetId, marker) => {
        markersById.current.set(assetId, marker);
        if (assetId === selected.current && !openMarker.current) requestAnimationFrame(() => marker.openPopup());
      },
      onRemove: (assetId) => {
        markersById.current.delete(assetId);
      },
      onKeyboardOpen: () => {
        openedByKeyboard.current = true;
      },
      onOpen: (assetId, marker) => {
        openMarker.current = marker;
        reportSelection.current(assetId);
        marker.getElement()?.classList.add(selectedMarkerClass);
        const content = marker.getPopup()?.getElement()?.querySelector<HTMLElement>(".leaflet-popup-content");
        if (openedByKeyboard.current && content) {
          content.tabIndex = -1;
          content.focus();
        }
        openedByKeyboard.current = false;
      },
      onClose: (assetId, marker) => {
        const icon = marker.getElement();
        icon?.classList.remove(selectedMarkerClass);
        if (openMarker.current === marker) openMarker.current = null;
        if (selected.current === assetId) reportSelection.current(null);
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
