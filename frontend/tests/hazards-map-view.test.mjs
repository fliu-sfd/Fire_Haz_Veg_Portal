import assert from "node:assert/strict";
import { test } from "node:test";
import { hazardBounds, SCOTTSDALE_VIEW, sameHazard } from "@/features/hazards/utils/map-view";

const hazard = {
  assetId: "1001",
  state: "open",
  propertyType: "naos",
  crewCode: "611A",
  inspectedAt: "2026-06-24T00:00:00Z",
  comments: null,
  siteAddress: null,
  latitude: 33.7,
  longitude: -111.9,
};

test("bounds cover every hazard", () => {
  const points = [
    { latitude: 33.7, longitude: -111.9 },
    { latitude: 33.5, longitude: -111.8 },
    { latitude: 33.6, longitude: -111.95 },
  ];
  assert.deepEqual(hazardBounds(points), [[33.5, -111.95], [33.7, -111.8]]);
});

test("a single hazard gives a zero-size box", () => {
  assert.deepEqual(hazardBounds([hazard]), [[33.7, -111.9], [33.7, -111.9]]);
});

test("no hazards gives no bounds, and the fallback view is Scottsdale", () => {
  assert.equal(hazardBounds([]), null);
  assert.deepEqual(SCOTTSDALE_VIEW, { center: [33.49, -111.93], zoom: 11 });
});

test("sameHazard compares every shown field", () => {
  assert.equal(sameHazard(hazard, { ...hazard }), true);
  assert.equal(sameHazard(hazard, { ...hazard, comments: "new" }), false);
  assert.equal(sameHazard(hazard, { ...hazard, latitude: 33.71 }), false);
});
