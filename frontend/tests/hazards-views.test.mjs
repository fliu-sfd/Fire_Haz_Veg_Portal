import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HAZARDS_QUERY } from "@/features/hazards/utils/query-params";
import {
  canSaveView,
  MAX_VIEWS,
  parseStoredViews,
  removeView,
  toSavedView,
  upsertView,
  viewNameProblem,
} from "@/features/hazards/utils/views";

const attention = { ...DEFAULT_HAZARDS_QUERY, needsAttention: true };

test("a saved view round-trips its filters and sort", () => {
  const [view] = upsertView([], "  Needs   follow-up ", attention, "newest");
  assert.deepEqual(view, { name: "Needs follow-up", params: "needs_attention=true&sort=newest" });
  assert.deepEqual(toSavedView(view), { name: "Needs follow-up", query: attention, sort: "newest" });
});

test("saving an existing name replaces it, ignoring case", () => {
  const views = upsertView([], "Station 611", { ...DEFAULT_HAZARDS_QUERY, crews: ["611A"] }, "oldest");
  const replaced = upsertView(views, "station 611", { ...DEFAULT_HAZARDS_QUERY, crews: ["611B"] }, "crew");
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].params, "crew=611B&sort=crew");
});

test("stops at the limit but still allows replacing", () => {
  let views = [];
  for (let i = 0; i < MAX_VIEWS; i++) views = upsertView(views, `View ${i}`, DEFAULT_HAZARDS_QUERY, "oldest");
  assert.equal(canSaveView(views, "One more"), false);
  assert.equal(upsertView(views, "One more", attention, "oldest").length, MAX_VIEWS);
  assert.equal(canSaveView(views, "view 3"), true);
});

test("removes a view by name", () => {
  const views = upsertView(upsertView([], "A", DEFAULT_HAZARDS_QUERY, "oldest"), "B", attention, "oldest");
  assert.deepEqual(removeView(views, "a").map((view) => view.name), ["B"]);
});

test("validates view names", () => {
  assert.equal(viewNameProblem("   "), "required");
  assert.equal(viewNameProblem("x".repeat(41)), "too_long");
  assert.equal(viewNameProblem("x".repeat(40)), null);
});

test("parse drops invalid entries, unknown values and duplicates", () => {
  const raw = JSON.stringify([
    { name: "Good", params: "has_photo=false&sort=asset" },
    { name: "", params: "" },
    { name: "Bad params", params: 7 },
    "not a view",
    { name: "good", params: "q=dup" },
    { name: "Junk values", params: "state=fixed&sort=random&has_photo=maybe&asset=1686017&extra=1" },
  ]);
  assert.deepEqual(parseStoredViews(raw), [
    { name: "Good", params: "has_photo=false&sort=asset" },
    // Unknown values fall back, and a stored asset is never kept.
    { name: "Junk values", params: "" },
  ]);
});

test("parse caps the list and rejects non-lists", () => {
  const many = Array.from({ length: 14 }, (_, i) => ({ name: `View ${i}`, params: "" }));
  assert.equal(parseStoredViews(JSON.stringify(many)).length, MAX_VIEWS);
  assert.equal(parseStoredViews("{}"), undefined);
  assert.equal(parseStoredViews("not json"), undefined);
});
