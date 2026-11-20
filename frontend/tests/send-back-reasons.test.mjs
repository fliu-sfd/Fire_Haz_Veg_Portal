import assert from "node:assert/strict";
import { test } from "node:test";
import { SEND_BACK_REASONS, addReason, canAddReason, hasReason } from "@/features/reviews/utils/send-back-reasons";

const [blurry, incomplete] = SEND_BACK_REASONS;

test("empty comment gets the sentence only", () => {
  assert.equal(addReason("", blurry), blurry.text);
  assert.equal(addReason("  \n", blurry), blurry.text);
});

test("existing comment gets the sentence on a new line", () => {
  assert.equal(addReason("See the back fence.", blurry), `See the back fence.\n${blurry.text}`);
  assert.equal(addReason("See the back fence.\n", blurry), `See the back fence.\n${blurry.text}`);
  const both = addReason(addReason("", blurry), incomplete);
  assert.equal(both, `${blurry.text}\n${incomplete.text}`);
});

test("same sentence twice is not added again", () => {
  const once = addReason("Note.", blurry);
  assert.equal(addReason(once, blurry), once);
  assert.ok(hasReason(once, blurry));
  assert.ok(!hasReason(once, incomplete));
  assert.ok(!canAddReason(once, blurry));
});

test("sentence that would pass the max length is not added", () => {
  const max = 100;
  const full = "x".repeat(max - blurry.text.length);
  assert.equal(addReason(full, blurry, max), full);
  assert.ok(!canAddReason(full, blurry, max));
  const fits = "x".repeat(max - blurry.text.length - 1);
  assert.equal(addReason(fits, blurry, max).length, max);
  assert.ok(canAddReason(fits, blurry, max));
});

test("default comment limit accepts 2,000 characters and rejects 2,001", () => {
  for (const reason of SEND_BACK_REASONS) {
    const fits = "x".repeat(2000 - reason.text.length - 1);
    assert.equal(addReason(fits, reason), `${fits}\n${reason.text}`);
    assert.equal(addReason(fits, reason).length, 2000);
    assert.ok(canAddReason(fits, reason));

    const tooLong = `${fits}x`;
    assert.equal(addReason(tooLong, reason), tooLong);
    assert.ok(!canAddReason(tooLong, reason));
  }
});

test("trailing whitespace leaves room for a reason at the default limit", () => {
  const existing = "x".repeat(2000 - blurry.text.length - 1);
  const comment = `${existing} \t\n`;
  assert.equal(addReason(comment, blurry), `${existing}\n${blurry.text}`);
  assert.equal(addReason(comment, blurry).length, 2000);
  assert.ok(canAddReason(comment, blurry));
});

test("editing or removing an inserted sentence makes the reason available again", () => {
  const original = addReason("See the back fence.", blurry);
  const edited = original.replace(blurry.text, "Please retake the fence photo.");
  assert.ok(!hasReason(edited, blurry));
  assert.ok(canAddReason(edited, blurry));
  assert.equal(addReason(edited, blurry), `See the back fence.\nPlease retake the fence photo.\n${blurry.text}`);

  const removed = original.replace(`\n${blurry.text}`, "");
  assert.ok(canAddReason(removed, blurry));
  assert.equal(addReason(removed, blurry), original);
});

test("every reason has a unique id, a label and a short sentence", () => {
  const ids = SEND_BACK_REASONS.map((reason) => reason.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const reason of SEND_BACK_REASONS) {
    assert.ok(reason.id.trim());
    assert.ok(reason.label.trim());
    assert.ok(reason.text.trim());
    assert.ok(reason.text.length < 200, reason.id);
  }
});
