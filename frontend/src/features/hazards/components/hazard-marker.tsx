"use client";

import type { LeafletEventHandlerFnMap, Marker as LeafletMarker } from "leaflet";
import { memo, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { HazardPopupContent } from "@/features/hazards/components/hazard-popup-content";
import { markerIcon } from "@/features/hazards/components/marker-icon";
import type { Hazard } from "@/features/hazards/types";
import { markerName } from "@/features/hazards/utils/display";
import { sameHazard } from "@/features/hazards/utils/map-view";

const POPUP_WIDTH = 264;

export type MarkerEvents = {
  onKeyboardOpen: () => void;
  onOpen: (marker: LeafletMarker) => void;
  onClose: (marker: LeafletMarker) => void;
};

type HazardMarkerProps = { hazard: Hazard; events: MarkerEvents };

function HazardMarkerComponent({ hazard, events }: HazardMarkerProps) {
  const name = markerName(hazard);

  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      add: (event) => (event.target as LeafletMarker).getElement()?.setAttribute("aria-label", name),
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
      popupopen: (event) => events.onOpen(event.target as LeafletMarker),
      popupclose: (event) => events.onClose(event.target as LeafletMarker),
    }),
    [name, events],
  );

  return (
    <Marker
      position={[hazard.latitude, hazard.longitude]}
      icon={markerIcon(hazard.state)}
      keyboard
      riseOnHover
      eventHandlers={eventHandlers}
    >
      {/* A fixed width: Leaflet measures the popup before React has filled it. */}
      <Popup minWidth={POPUP_WIDTH} maxWidth={POPUP_WIDTH} autoPanPadding={[16, 16]}>
        <HazardPopupContent hazard={hazard} />
      </Popup>
    </Marker>
  );
}

export const HazardMarker = memo(
  HazardMarkerComponent,
  (prev, next) => prev.events === next.events && sameHazard(prev.hazard, next.hazard),
);
