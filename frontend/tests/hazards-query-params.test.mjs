import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeFilterCount,
  DEFAULT_HAZARDS_QUERY,
  hasActiveFilters,
  hazardsQueryToApiParams,
  parseHazardsQuery,
  toggleCrew,
  toggleState,
  withKnownCrews,
} from "@/features/hazards/utils/query-params";

const parse = (search) => parseHazardsQuery(new URLSearchParams(search));

test("an empty URL gives the default query", () => {
  assert.deepEqual(parse(""), DEFAULT_HAZARDS_QUERY);
});

test("reads repeated state and crew values in a fixed order", () => {
  assert.deepEqual(parse("state=closed&state=open&crew=613B&crew=611A&crew=611A&property_type=naos"), {
    ...DEFAULT_HAZARDS_QUERY,
    states: ["open", "closed"],
    crews: ["611A", "613B"],
    propertyType: "naos",
  });
});

test("invalid URL values fall back to defaults", () => {
  assert.deepEqual(parse("state=fixed&property_type=farm&crew=&crew=" + "x".repeat(17)), DEFAULT_HAZARDS_QUERY);
  assert.deepEqual(parse("state=fixed&state=closed").states, ["closed"]);
});

test("defaults are left out of the params", () => {
  assert.equal(hazardsQueryToApiParams(DEFAULT_HAZARDS_QUERY).toString(), "");
  assert.equal(hazardsQueryToApiParams({ ...DEFAULT_HAZARDS_QUERY, states: ["closed", "open", "pending_review"] }).toString(), "");
});

test("params round-trip through the URL", () => {
  const query = { ...DEFAULT_HAZARDS_QUERY, states: ["pending_review"], crews: ["611A", "612C"], propertyType: "residential" };
  assert.deepEqual(parseHazardsQuery(hazardsQueryToApiParams(query)), query);
});

test("at least one status stays selected", () => {
  assert.deepEqual(toggleState(["open"], "open"), ["open"]);
  assert.deepEqual(toggleState(["open", "closed"], "open"), ["closed"]);
  assert.deepEqual(toggleState(["closed"], "open"), ["open", "closed"]);
});

test("toggleCrew adds in sorted order and removes", () => {
  assert.deepEqual(toggleCrew(["613A"], "611B"), ["611B", "613A"]);
  assert.deepEqual(toggleCrew(["611B", "613A"], "611B"), ["613A"]);
});

test("withKnownCrews drops crews the server does not offer", () => {
  const query = { ...DEFAULT_HAZARDS_QUERY, crews: ["611A", "999Z"] };
  assert.deepEqual(withKnownCrews(query, ["611A", "611B"]).crews, ["611A"]);
  const unchanged = { ...DEFAULT_HAZARDS_QUERY, crews: ["611A"] };
  assert.equal(withKnownCrews(unchanged, ["611A"]), unchanged);
});

test("counts active filters", () => {
  assert.equal(activeFilterCount(DEFAULT_HAZARDS_QUERY), 0);
  assert.equal(hasActiveFilters(DEFAULT_HAZARDS_QUERY), false);
  assert.equal(activeFilterCount({ ...DEFAULT_HAZARDS_QUERY, states: ["open"], crews: ["611A", "611B"], propertyType: "naos" }), 3);
});
