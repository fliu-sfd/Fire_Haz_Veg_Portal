import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lastChangedText,
  limitsNote,
  normalizeMessage,
  previewFor,
  replaceMessage,
  validateMessage,
} from "@/features/settings/utils/message";

const limits = { minLength: 10, maxLength: 40, maxLines: 3 };

// The same cases as test_clean_message_tidies_text in the backend's registry test.
const CLEANED = [
  ["  Call the department  ", "Call the department"],
  ["Call   the    department", "Call the department"],
  ["First line here\nSecond line", "First line here\nSecond line"],
  ["First line here\r\nSecond line", "First line here\nSecond line"],
  ["First line here  \n  Second line", "First line here\nSecond line"],
  ["\n\nCall the department\n\n", "Call the department"],
  ["First line here\n\n\n\nLast line", "First line here\n\nLast line"],
  ["First line here\n \n \nLast line", "First line here\n\nLast line"],
  ["Call\x00 the\x07 depart\x1fment", "Call the department"],
  ["<b>Call</b> & <i>ask</i>", "<b>Call</b> & <i>ask</i>"],
];

for (const [raw, expected] of CLEANED) {
  test(`normalizeMessage cleans ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(normalizeMessage(raw, limits), { text: expected, length: expected.length });
    assert.equal(normalizeMessage(expected, limits).text, expected);
  });
}

// The same cases as test_clean_message_rejects_text_outside_the_limits.
const REJECTED = [
  ["", "Message must be at least 10 characters"],
  [" \n \n ", "Message must be at least 10 characters"],
  ["Too short", "Message must be at least 10 characters"],
  ["x".repeat(41), "Message must be at most 40 characters"],
  ["one line\ntwo line\nthree line\nfour", "Message must be at most 3 lines"],
];

for (const [raw, error] of REJECTED) {
  test(`validateMessage rejects ${JSON.stringify(raw.slice(0, 20))}`, () => {
    assert.equal(validateMessage(raw, limits), error);
  });
}

test("length limits are inclusive and measured after cleaning", () => {
  assert.equal(validateMessage("x".repeat(10), limits), undefined);
  assert.equal(validateMessage("x".repeat(40), limits), undefined);
  assert.equal(validateMessage(`   ${"x".repeat(40)}   `, limits), undefined);
});

test("the limits come from the message, not from the code", () => {
  const strict = { minLength: 2, maxLength: 5, maxLines: 1 };
  assert.equal(validateMessage("ok", strict), undefined);
  assert.equal(validateMessage("toolong", strict), "Message must be at most 5 characters");
  assert.equal(validateMessage("a\nb", strict), "Message must be at most 1 line");
  assert.equal(validateMessage("ok", limits), "Message must be at least 10 characters");
});

test("a blank line counts as a line", () => {
  assert.equal(validateMessage("first line\n\nthird line", limits), undefined);
  assert.equal(validateMessage("first line\n\nthird line", { ...limits, maxLines: 2 }), "Message must be at most 2 lines");
});

test("an emoji counts as one character, as it does on the backend", () => {
  const emoji = "🔥".repeat(40);
  assert.equal(normalizeMessage(emoji, limits).length, 40);
  assert.equal(validateMessage(emoji, limits), undefined);
});

test("limitsNote is built from the limits", () => {
  assert.equal(limitsNote(limits), "Up to 3 lines. Plain text only.");
  assert.equal(limitsNote({ ...limits, maxLines: 1 }), "Up to 1 line. Plain text only.");
});

test("replacing one item leaves the others unchanged", () => {
  const first = { key: "first", message: "one" };
  const second = { key: "second", message: "two" };
  const third = { key: "third", message: "three" };
  const updated = { key: "second", message: "new" };

  const result = replaceMessage([first, second, third], updated);

  assert.deepEqual(result.map((item) => item.message), ["one", "new", "three"]);
  assert.equal(result[0], first);
  assert.equal(result[2], third);
});

test("replacing a key not in the list changes nothing", () => {
  const first = { key: "first", message: "one" };
  assert.deepEqual(replaceMessage([first], { key: "other", message: "x" }), [first]);
});

test("lastChangedText covers each state", () => {
  const changed = { isDefault: false, updatedAt: "2026-11-03T17:00:00Z", updatedByName: "Ava Admin" };
  assert.equal(lastChangedText(changed, "America/Phoenix"), "Last changed by Ava Admin on Nov 3, 2026.");
  assert.equal(lastChangedText({ ...changed, updatedByName: null }, "America/Phoenix"), "Last changed on Nov 3, 2026.");
  assert.equal(lastChangedText({ ...changed, isDefault: true }), "Using the default message.");
  assert.equal(lastChangedText({ isDefault: true, updatedAt: null, updatedByName: null }), "Using the default message.");
});

test("the preview lookup falls back for an unknown key", () => {
  const previews = { known: "custom" };
  assert.equal(previewFor(previews, "known", "plain"), "custom");
  assert.equal(previewFor(previews, "unknown", "plain"), "plain");
  assert.equal(previewFor(previews, "constructor", "plain"), "plain");
});
