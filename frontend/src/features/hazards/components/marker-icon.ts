import { divIcon, type DivIcon } from "leaflet";
import { GLYPH_PATHS } from "@/features/hazards/components/state-glyph";
import type { HazardState } from "@/features/hazards/types";
import { STATE_STYLES } from "@/features/hazards/utils/display";
import styles from "./hazard-map.module.css";

const HIT_AREA = 44;

// divIcon markers are plain CSS, so they avoid Leaflet's default marker images (which
// break under bundlers) and extra image requests. The markup is built only from the
// fixed state styles above, never from hazard data.
function buildIcon(state: HazardState): DivIcon {
  const { color, glyphColor, glyph } = STATE_STYLES[state];
  return divIcon({
    className: styles.markerIcon,
    iconSize: [HIT_AREA, HIT_AREA],
    iconAnchor: [HIT_AREA / 2, HIT_AREA / 2],
    popupAnchor: [0, -18],
    html:
      `<span class="${styles.marker}" style="--marker-fill: var(--color-${color}); --marker-glyph: var(--color-${glyphColor})">` +
      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `<path d="${GLYPH_PATHS[glyph]}"/></svg></span>`,
  });
}

const icons = new Map<HazardState, DivIcon>();

/** One shared icon per state, so re-renders never swap a marker's element. */
export function markerIcon(state: HazardState): DivIcon {
  let icon = icons.get(state);
  if (!icon) {
    icon = buildIcon(state);
    icons.set(state, icon);
  }
  return icon;
}

export const selectedMarkerClass = styles.selected;
