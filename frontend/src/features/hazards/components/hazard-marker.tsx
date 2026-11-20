"use client";

import type { LeafletEventHandlerFnMap, Marker as LeafletMarker } from "leaflet";
import { memo, useCallback, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Marker, Popup } from "react-leaflet";
import { HazardPopupContent } from "@/features/hazards/components/hazard-popup-content";
import { markerIcon } from "@/features/hazards/components/marker-icon";
import type { Hazard } from "@/features/hazards/types";
import { markerName } from "@/features/hazards/utils/display";
import { sameHazard } from "@/features/hazards/utils/map-view";

const POPUP_WIDTH = 300;

export type MarkerEvents = {
  onAdd: (assetId: string, marker: LeafletMarker) => void;
  onRemove: (assetId: string) => void;
  onKeyboardOpen: () => void;
  onOpen: (assetId: string, marker: LeafletMarker) => void;
  onClose: (assetId: string, marker: LeafletMarker) => void;
};

type HazardMarkerProps = { hazard: Hazard; events: MarkerEvents };

/** Measures the open popup again and pans the map so all of it shows. */
function repanPopup(marker: LeafletMarker | null) {
  const popup = marker?.getPopup();
  // Leaflet skips one auto-pan right after it has panned, so the second call is the one
  // that moves the map when the first was skipped.
  popup?.update();
  popup?.update();
}

/** React fills the popup after Leaflet opens it, so Leaflet measures and pans again once the content is in. */
function PopupBody({ onRendered, children }: { onRendered: () => void; children: ReactNode }) {
  useLayoutEffect(onRendered, [onRendered]);
  return children;
}

function HazardMarkerComponent({ hazard, events }: HazardMarkerProps) {
  const name = markerName(hazard);
  const { assetId } = hazard;
  const markerRef = useRef<LeafletMarker>(null);
  const refreshPopup = useCallback(() => repanPopup(markerRef.current), []);

  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      add: (event) => {
        const marker = event.target as LeafletMarker;
        marker.getElement()?.setAttribute("aria-label", name);
        events.onAdd(assetId, marker);
      },
      remove: () => events.onRemove(assetId),
      keydown: (event) => {
        const key = (event as unknown as { originalEvent: KeyboardEvent }).originalEvent;
        if (key.key !== "Enter" && key.key !== " ") return;
        events.onKeyboardOpen();
        // Leaflet opens popups on Enter by itself but ignores Space.
        if (key.key === " ") {
          key.preventDefault();
          (event.target as LeafletMarker).openPopup();
        }
      },
      popupopen: (event) => events.onOpen(assetId, event.target as LeafletMarker),
      popupclose: (event) => events.onClose(assetId, event.target as LeafletMarker),
    }),
    [name, assetId, events],
  );

  return (
    <Marker
      ref={markerRef}
      position={[hazard.latitude, hazard.longitude]}
      icon={markerIcon(hazard.state)}
      keyboard
      riseOnHover
      eventHandlers={eventHandlers}
    >
      {/* A fixed width: Leaflet measures the popup before React has filled it. */}
      <Popup minWidth={POPUP_WIDTH} maxWidth={POPUP_WIDTH} autoPanPadding={[16, 16]}>
        <PopupBody onRendered={refreshPopup}>
          <HazardPopupContent hazard={hazard} />
        </PopupBody>
      </Popup>
    </Marker>
  );
}

export const HazardMarker = memo(
  HazardMarkerComponent,
  (prev, next) => prev.events === next.events && sameHazard(prev.hazard, next.hazard),
);
