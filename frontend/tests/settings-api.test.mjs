import assert from "node:assert/strict";
import { test } from "node:test";
import { listMessages, parseMessage, parseMessageList, resetMessage, saveMessage } from "@/features/settings/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const raw = {
  key: "disabled_account_message",
  label: "Disabled account message",
  description: "Shown when a disabled person signs in with the correct password.",
  message: "Call the department.",
  default_message: "Account is disabled.",
  is_default: false,
  min_length: 10,
  max_length: 500,
  max_lines: 3,
  updated_at: "2026-11-03T17:00:00Z",
  updated_by_name: "Ava Admin",
};

test("a message converts to camelCase", () => {
  assert.deepEqual(parseMessage(raw), {
    key: raw.key,
    label: raw.label,
    description: raw.description,
    message: raw.message,
    defaultMessage: raw.default_message,
    isDefault: false,
    minLength: 10,
    maxLength: 500,
    maxLines: 3,
    updatedAt: raw.updated_at,
    updatedByName: "Ava Admin",
  });
});

test("a message never changed has no date or name", () => {
  const parsed = parseMessage({ ...raw, is_default: true, updated_at: null, updated_by_name: null });
  assert.equal(parsed.updatedAt, null);
  assert.equal(parsed.updatedByName, null);
});

for (const field of Object.keys(raw)) {
  test(`a message missing ${field} is rejected`, () => {
    const { [field]: _removed, ...rest } = raw;
    assert.throws(() => parseMessage(rest), ResponseFormatError);
  });
}

const wrongTypes = {
  key: 1,
  label: null,
  description: 2,
  message: null,
  default_message: 3,
  is_default: "true",
  min_length: "10",
  max_length: -1,
  max_lines: 1.5,
  updated_at: "not a date",
  updated_by_name: 4,
};

for (const [field, value] of Object.entries(wrongTypes)) {
  test(`a message with a wrong ${field} is rejected`, () => {
    assert.throws(() => parseMessage({ ...raw, [field]: value }), ResponseFormatError);
  });
}

test("a list with several items keeps them in order", () => {
  const list = parseMessageList({ items: [raw, { ...raw, key: "second_message" }, { ...raw, key: "third_message" }] });
  assert.deepEqual(list.map((message) => message.key), [raw.key, "second_message", "third_message"]);
});

test("an empty list is valid", () => {
  assert.deepEqual(parseMessageList({ items: [] }), []);
});

for (const [name, data] of Object.entries({
  "a bare array": [raw],
  "no items": {},
  "items that are not a list": { items: "x" },
  "a bad item": { items: [raw, { key: "x" }] },
})) {
  test(`a list with ${name} is rejected`, () => {
    assert.throws(() => parseMessageList(data), ResponseFormatError);
  });
}

test("listMessages reads the list endpoint", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ items: [raw] }));
  assert.equal((await listMessages()).length, 1);
  assert.match(fetchMock.mock.calls[0].arguments[0], /\/admin\/settings\/messages$/);
});

test("saveMessage sends only the message, with the key encoded", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json(raw));
  await saveMessage("a/b c", "New words here");
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.match(url, /\/admin\/settings\/messages\/a%2Fb%20c$/);
  assert.equal(options.method, "PUT");
  assert.deepEqual(JSON.parse(options.body), { message: "New words here" });
});

test("resetMessage deletes and returns the message", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json(raw));
  assert.equal((await resetMessage(raw.key)).key, raw.key);
  assert.equal(fetchMock.mock.calls[0].arguments[1].method, "DELETE");
});

test("a bad response shape throws ResponseFormatError", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ nope: true }));
  await assert.rejects(saveMessage(raw.key, "New words here"), ResponseFormatError);
});

test("an API failure throws ApiError", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Not authenticated" }, { status: 401 }));
  await assert.rejects(listMessages(), ApiError);
});
