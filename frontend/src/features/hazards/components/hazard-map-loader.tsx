"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "@/features/hazards/components/map-skeleton";

// Leaflet touches window on import, so the map only ever renders in the browser.
// Next allows ssr: false only inside a Client Component like this one.
export const HazardMapLoader = dynamic(() => import("@/features/hazards/components/hazard-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
