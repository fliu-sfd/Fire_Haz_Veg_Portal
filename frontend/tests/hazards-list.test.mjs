import assert from "node:assert/strict";
import { test } from "node:test";
import { LIST_PAGE_SIZE, sortHazards, windowSize } from "@/features/hazards/utils/list";

function hazard(assetId, inspectedAt, crewCode = "611A") {
  return { assetId, inspectedAt, crewCode };
}

const hazards = [
  hazard("1002", "2026-06-10T19:00:00Z", "613A"),
  hazard("999", "2026-06-01T19:00:00Z", "611B"),
  hazard("1001", "2026-06-10T19:00:00Z", null),
  hazard("1003", null, "611A"),
  hazard("1000", "2026-06-20T19:00:00Z", "611A"),
];

const ids = (list) => list.map((item) => item.assetId);

test("oldest first puts missing dates last and breaks ties by asset ID", () => {
  assert.deepEqual(ids(sortHazards(hazards, "oldest")), ["999", "1001", "1002", "1000", "1003"]);
});

test("newest first also keeps missing dates last", () => {
  assert.deepEqual(ids(sortHazards(hazards, "newest")), ["1000", "1001", "1002", "999", "1003"]);
});

test("asset ID sorts numerically", () => {
  assert.deepEqual(ids(sortHazards(hazards, "asset")), ["999", "1000", "1001", "1002", "1003"]);
});

test("station/shift sorts by crew with asset ID as the tie break", () => {
  assert.deepEqual(ids(sortHazards(hazards, "crew")), ["1000", "1003", "999", "1002", "1001"]);
});

test("sorting never changes the input", () => {
  const before = ids(hazards);
  sortHazards(hazards, "asset");
  assert.deepEqual(ids(hazards), before);
});

test("the window grows to include a selection past it", () => {
  assert.equal(windowSize(120, LIST_PAGE_SIZE, -1), 50);
  assert.equal(windowSize(120, LIST_PAGE_SIZE, 10), 50);
  assert.equal(windowSize(120, LIST_PAGE_SIZE, 50), 100);
  assert.equal(windowSize(120, LIST_PAGE_SIZE, 119), 120);
  assert.equal(windowSize(30, LIST_PAGE_SIZE, -1), 30);
  assert.equal(windowSize(120, 100, 5), 100);
});
