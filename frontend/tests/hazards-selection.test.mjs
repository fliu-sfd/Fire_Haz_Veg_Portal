import assert from "node:assert/strict";
import { test } from "node:test";
import { missingAssetMessage, missingSelection } from "@/features/hazards/utils/selection";

const hazards = [{ assetId: "1686017" }, { assetId: "2045117" }];

test("no notice when nothing is selected or the asset is shown", () => {
  assert.equal(missingSelection(null, hazards, true), null);
  assert.equal(missingSelection("1686017", hazards, true), null);
});

test("no notice while results are still loading", () => {
  assert.equal(missingSelection("999", hazards, false), null);
});

test("a selected asset missing from settled results needs a notice", () => {
  assert.equal(missingSelection("999", hazards, true), "999");
  assert.equal(missingSelection("999", [], true), "999");
});

test("the notice explains why", () => {
  assert.equal(
    missingAssetMessage("1686017"),
    "Asset 1686017 is not in the current results. It may be hidden by the filters.",
  );
});
