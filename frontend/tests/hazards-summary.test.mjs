import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HAZARDS_QUERY } from "@/features/hazards/utils/query-params";
import { statesAfterTileClick, summaryTiles } from "@/features/hazards/utils/summary";

test("a state tile selects only that state", () => {
  assert.deepEqual(statesAfterTileClick(["open", "pending_review", "closed"], "open"), ["open"]);
  assert.deepEqual(statesAfterTileClick(["pending_review", "closed"], "closed"), ["closed"]);
});

test("clicking the only selected state brings every state back", () => {
  assert.deepEqual(statesAfterTileClick(["open"], "open"), ["open", "pending_review", "closed"]);
});

test("tiles carry counts and pressed states", () => {
  const summary = { byState: { open: 70, pending_review: 0, closed: 0 }, needsAttention: 12 };
  const tiles = summaryTiles(summary, 70, { ...DEFAULT_HAZARDS_QUERY, states: ["open"], needsAttention: true });
  assert.deepEqual(
    tiles.map((tile) => [tile.label, tile.count, "pressed" in tile ? tile.pressed : null]),
    [
      ["Total", 70, null],
      ["Open", 70, true],
      ["Pending review", 0, false],
      ["Closed", 0, false],
      ["Needs attention", 12, true],
    ],
  );
});

test("no state tile is pressed while every state is shown", () => {
  const summary = { byState: { open: 5, pending_review: 0, closed: 0 }, needsAttention: 0 };
  const tiles = summaryTiles(summary, 5, DEFAULT_HAZARDS_QUERY);
  assert.equal(tiles.some((tile) => tile.kind === "state" && tile.pressed), false);
});
