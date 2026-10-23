import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeFilterCount,
  DEFAULT_HAZARDS_QUERY,
  hasActiveFilters,
  hazardsPageStateToSearchParams,
  hazardsQueryToApiParams,
  normalizeDateRange,
  parseHazardsPageState,
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

const pageState = (search) => parseHazardsPageState(new URLSearchParams(search));

test("reads every new filter from the URL", () => {
  assert.deepEqual(
    parse("q=%20%20Desert%20%20Rd%20&inspected_from=2026-06-01&inspected_to=2026-06-24&has_photo=false&needs_attention=true"),
    {
      ...DEFAULT_HAZARDS_QUERY,
      q: "Desert Rd",
      inspectedFrom: "2026-06-01",
      inspectedTo: "2026-06-24",
      hasPhoto: false,
      needsAttention: true,
    },
  );
});

test("invalid new values fall back to defaults", () => {
  const query = parse("inspected_from=2026-02-30&inspected_to=24-06-2026&has_photo=yes&needs_attention=false&q=%20");
  assert.deepEqual(query, DEFAULT_HAZARDS_QUERY);
  assert.equal(parse(`q=${"x".repeat(150)}`).q.length, 100);
});

test("a reversed date range is dropped", () => {
  const query = parse("inspected_from=2026-06-24&inspected_to=2026-06-01");
  assert.equal(query.inspectedFrom, null);
  assert.equal(query.inspectedTo, null);
});

test("reads sort and asset, falling back for bad values", () => {
  assert.deepEqual(pageState("sort=crew&asset=1686017"), { query: DEFAULT_HAZARDS_QUERY, sort: "crew", asset: "1686017" });
  assert.deepEqual(pageState("sort=random&asset=%20"), { query: DEFAULT_HAZARDS_QUERY, sort: "oldest", asset: null });
  assert.equal(pageState(`asset=${"9".repeat(40)}`).asset, null);
});

test("sort and asset never reach the API params", () => {
  const state = {
    query: { ...DEFAULT_HAZARDS_QUERY, q: "ridge", needsAttention: true },
    sort: "newest",
    asset: "1686017",
  };
  const api = hazardsQueryToApiParams(state.query);
  assert.equal(api.has("sort"), false);
  assert.equal(api.has("asset"), false);
  assert.deepEqual(Object.fromEntries(api), { q: "ridge", needs_attention: "true" });
  const url = hazardsPageStateToSearchParams(state);
  assert.equal(url.get("sort"), "newest");
  assert.equal(url.get("asset"), "1686017");
});

test("the default sort is left out of the URL", () => {
  assert.equal(hazardsPageStateToSearchParams({ query: DEFAULT_HAZARDS_QUERY, sort: "oldest", asset: null }).toString(), "");
});

test("every new filter round-trips through the URL", () => {
  const state = {
    query: {
      ...DEFAULT_HAZARDS_QUERY,
      crews: ["611A"],
      q: "50% off_road",
      inspectedFrom: "2026-05-01",
      inspectedTo: null,
      hasPhoto: true,
      needsAttention: true,
    },
    sort: "asset",
    asset: "A-1",
  };
  assert.deepEqual(parseHazardsPageState(hazardsPageStateToSearchParams(state)), state);
});

test("new filters count as active", () => {
  assert.equal(activeFilterCount({ ...DEFAULT_HAZARDS_QUERY, q: "x" }), 1);
  assert.equal(activeFilterCount({ ...DEFAULT_HAZARDS_QUERY, inspectedFrom: "2026-06-01", inspectedTo: "2026-06-02" }), 1);
  assert.equal(activeFilterCount({ ...DEFAULT_HAZARDS_QUERY, hasPhoto: false, needsAttention: true }), 2);
});

test("normalizeDateRange keeps one-sided ranges", () => {
  assert.deepEqual(normalizeDateRange("2026-06-01", null), { inspectedFrom: "2026-06-01", inspectedTo: null });
  assert.deepEqual(normalizeDateRange(null, "2026-06-01"), { inspectedFrom: null, inspectedTo: "2026-06-01" });
});
