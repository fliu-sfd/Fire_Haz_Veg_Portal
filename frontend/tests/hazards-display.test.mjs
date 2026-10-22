import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addressText,
  filterChips,
  formatInspectedDate,
  markerName,
  resultSummary,
  STATE_STYLES,
  stateLabel,
} from "@/features/hazards/utils/display";
import { accessProblem, hazardErrorMessage } from "@/features/hazards/utils/errors";
import { DEFAULT_HAZARDS_QUERY } from "@/features/hazards/utils/query-params";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

test("states have plain labels, portal colors and distinct glyphs", () => {
  assert.equal(stateLabel("open"), "Open");
  assert.equal(stateLabel("pending_review"), "Pending review");
  assert.equal(stateLabel("closed"), "Closed");
  assert.deepEqual(
    Object.values(STATE_STYLES).map((style) => style.color),
    ["fire-red", "city-orange", "success-dark"],
  );
  const glyphs = Object.values(STATE_STYLES).map((style) => style.glyph);
  assert.equal(new Set(glyphs).size, glyphs.length);
});

test("markers get an accessible name", () => {
  assert.equal(markerName({ assetId: "1686017", state: "open" }), "Asset 1686017, open");
  assert.equal(markerName({ assetId: "7", state: "pending_review" }), "Asset 7, pending review");
});

test("a NAOS hazard without an address is labeled Community NAOS", () => {
  assert.equal(addressText({ siteAddress: null, propertyType: "naos" }), "Community NAOS");
  assert.equal(addressText({ siteAddress: "7 Desert Rd", propertyType: "naos" }), "7 Desert Rd");
  assert.equal(addressText({ siteAddress: null, propertyType: "residential" }), null);
});

test("formats the inspection date", () => {
  assert.equal(formatInspectedDate("2026-06-24T18:00:00Z", "America/Phoenix"), "Jun 24, 2026");
  assert.equal(formatInspectedDate(null), "Not recorded");
});

test("summarizes the result count and the cap", () => {
  assert.equal(resultSummary(76, 76), "Showing 76 hazards");
  assert.equal(resultSummary(1, 1), "Showing 1 hazard");
  assert.equal(resultSummary(5000, 6200), "Showing 5,000 of 6,200 hazards");
  assert.equal(resultSummary(0, 0), "No hazards to show");
});

test("builds one chip per active filter", () => {
  assert.deepEqual(filterChips(DEFAULT_HAZARDS_QUERY), []);
  const chips = filterChips({ states: ["open", "closed"], crews: ["611A", "613B"], propertyType: "naos" });
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ["Status: Open, Closed", "Station/Shift: 611A", "Station/Shift: 613B", "Property type: NAOS"],
  );
  assert.deepEqual(chips[1], { id: "crew:611A", kind: "crew", crew: "611A", label: "Station/Shift: 611A" });
});

test("maps hazard errors to friendly messages", () => {
  assert.equal(accessProblem(new ApiError(401, null)), "unauthorized");
  assert.equal(accessProblem(new ApiError(403, null)), "forbidden");
  assert.equal(hazardErrorMessage(new ApiError(403, null)), "Administrator access required.");
  assert.match(hazardErrorMessage(new ApiError(422, { detail: [] })), /filters were not accepted/);
  assert.match(hazardErrorMessage(new ApiError(500, "Traceback")), /could not load hazards/);
  assert.doesNotMatch(hazardErrorMessage(new ResponseFormatError("raw")), /raw/);
});
