import assert from "node:assert/strict";
import { test } from "node:test";
import { getHazardFilters, listHazards, parseHazardFilterOptions, parseHazardList } from "@/features/hazards/api";
import { DEFAULT_HAZARDS_QUERY } from "@/features/hazards/utils/query-params";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const validHazard = {
  asset_id: "1686017",
  state: "open",
  property_type: "naos",
  crew_code: "614A",
  inspected_at: "2026-06-24T00:00:00Z",
  comments: "Brush needs to be trimmed",
  site_address: null,
  photo_count: 2,
  age_days: 12,
  attention_reasons: ["no_comment"],
  latitude: 33.7,
  longitude: -111.9,
};

const validSummary = { by_state: { open: 1, pending_review: 0, closed: 0 }, needs_attention: 1 };
const validList = { season_year: 2026, total: 1, summary: validSummary, items: [validHazard] };
const validFilters = { season_year: 2026, crews: ["611A", "611B"], property_types: ["naos"] };

function mockFetch(t, response = Response.json(validList)) {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(new URL(url));
    return response.clone();
  });
  return urls;
}

test("listHazards sends no query string for the default view", async (t) => {
  const urls = mockFetch(t);
  await listHazards(DEFAULT_HAZARDS_QUERY);
  assert.match(urls[0].pathname, /\/admin\/hazards$/);
  assert.equal(urls[0].search, "");
});

test("listHazards repeats state and crew params and sends the property type", async (t) => {
  const urls = mockFetch(t);
  await listHazards({ states: ["open", "closed"], crews: ["611A", "613B"], propertyType: "naos" });
  assert.deepEqual(urls[0].searchParams.getAll("state"), ["open", "closed"]);
  assert.deepEqual(urls[0].searchParams.getAll("crew"), ["611A", "613B"]);
  assert.equal(urls[0].searchParams.get("property_type"), "naos");
});

test("listHazards maps snake_case fields to camelCase", async (t) => {
  mockFetch(t);
  assert.deepEqual(await listHazards(DEFAULT_HAZARDS_QUERY), {
    seasonYear: 2026,
    total: 1,
    summary: { byState: { open: 1, pending_review: 0, closed: 0 }, needsAttention: 1 },
    items: [{
      assetId: "1686017",
      state: "open",
      propertyType: "naos",
      crewCode: "614A",
      inspectedAt: "2026-06-24T00:00:00Z",
      comments: "Brush needs to be trimmed",
      siteAddress: null,
      photoCount: 2,
      ageDays: 12,
      attentionReasons: ["no_comment"],
      latitude: 33.7,
      longitude: -111.9,
    }],
  });
});

test("parseHazardList accepts the empty shape", () => {
  const summary = { by_state: { open: 0, pending_review: 0, closed: 0 }, needs_attention: 0 };
  assert.deepEqual(parseHazardList({ season_year: null, total: 0, summary, items: [] }), {
    seasonYear: null,
    total: 0,
    summary: { byState: { open: 0, pending_review: 0, closed: 0 }, needsAttention: 0 },
    items: [],
  });
});

const badItems = {
  "unknown state": { state: "fixed" },
  "unknown property type": { property_type: "commercial" },
  "latitude out of range": { latitude: 91 },
  "longitude out of range": { longitude: -181 },
  "latitude not finite": { latitude: Number.NaN },
  "latitude as text": { latitude: "33.7" },
  "missing asset id": { asset_id: undefined },
  "missing crew": { crew_code: undefined },
  "bad date": { inspected_at: "yesterday" },
};

for (const [name, change] of Object.entries(badItems)) {
  test(`parseHazardList rejects an item with ${name}`, () => {
    const item = { ...validHazard, ...change };
    assert.throws(() => parseHazardList({ ...validList, items: [item] }), ResponseFormatError);
  });
}

test("parseHazardList rejects a bad envelope", () => {
  for (const body of [null, [], { ...validList, total: -1 }, { ...validList, season_year: "2026" }, { total: 0 }]) {
    assert.throws(() => parseHazardList(body), ResponseFormatError);
  }
});

test("getHazardFilters maps the filter options", async (t) => {
  const urls = mockFetch(t, Response.json(validFilters));
  assert.deepEqual(await getHazardFilters(), {
    seasonYear: 2026,
    crews: ["611A", "611B"],
    propertyTypes: ["naos"],
  });
  assert.match(urls[0].pathname, /\/admin\/hazards\/filters$/);
});

test("parseHazardFilterOptions rejects bad values", () => {
  assert.throws(() => parseHazardFilterOptions({ ...validFilters, crews: [1] }), ResponseFormatError);
  assert.throws(() => parseHazardFilterOptions({ ...validFilters, property_types: ["farm"] }), ResponseFormatError);
  assert.throws(() => parseHazardFilterOptions({ crews: [] }), ResponseFormatError);
});

for (const status of [401, 403, 422]) {
  test(`listHazards passes a ${status} through as an ApiError`, async (t) => {
    mockFetch(t, Response.json({ detail: "nope" }, { status }));
    await assert.rejects(listHazards(DEFAULT_HAZARDS_QUERY), (error) => error instanceof ApiError && error.status === status);
  });
}
