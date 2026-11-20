// OpenStreetMap's usage policy discourages heavy production use, so the production
// provider is set through these variables without a code change. Never put a key here:
// NEXT_PUBLIC_ values ship to every browser.
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_TILES = {
  url: process.env.NEXT_PUBLIC_MAP_TILE_URL || OSM_TILE_URL,
  attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || OSM_ATTRIBUTION,
};
