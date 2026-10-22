import assert from "node:assert/strict";
import { test } from "node:test";
import { copyText } from "@/lib/clipboard";

function withClipboard(t, writeText) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText } }, configurable: true });
  t.after(() => Object.defineProperty(globalThis, "navigator", original));
}

test("copyText reports success", async (t) => {
  const copied = [];
  withClipboard(t, async (text) => copied.push(text));
  assert.equal(await copyText("https://example.com/?asset=1"), true);
  assert.deepEqual(copied, ["https://example.com/?asset=1"]);
});

test("copyText never throws when the clipboard is blocked", async (t) => {
  withClipboard(t, async () => {
    throw new Error("NotAllowedError");
  });
  assert.equal(await copyText("x"), false);
});
