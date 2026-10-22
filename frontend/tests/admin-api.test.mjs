import assert from "node:assert/strict";
import { test } from "node:test";
import { listUsers, parseAdminUserList } from "@/features/admin/api";
import { DEFAULT_USERS_QUERY } from "@/features/admin/utils/query-params";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const validUser = {
  id: "8f9d2a8e-7b1c-4d7e-9a43-0c2f7f1e5b6a",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  role: "resident",
  asset_ids: ["A-100", "A-200"],
  created_at: "2026-10-01T15:30:00Z",
};

const validList = { items: [validUser], total: 1, limit: 25, offset: 0 };

function mockFetch(t, response = Response.json(validList)) {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(new URL(url));
    return response.clone();
  });
  return urls;
}

test("listUsers sends no query string for the default view", async (t) => {
  const urls = mockFetch(t);
  await listUsers(DEFAULT_USERS_QUERY);
  assert.match(urls[0].pathname, /\/admin\/users$/);
  assert.equal(urls[0].search, "");
});

test("listUsers sends only non-default filters", async (t) => {
  const urls = mockFetch(t);
  await listUsers({ ...DEFAULT_USERS_QUERY, q: "ada", role: "admin", sort: "email", order: "asc" });
  assert.deepEqual(Object.fromEntries(urls[0].searchParams), {
    q: "ada",
    role: "admin",
    sort: "email",
    order: "asc",
  });
});

test("listUsers converts the page number to an offset", async (t) => {
  const urls = mockFetch(t);
  await listUsers({ ...DEFAULT_USERS_QUERY, limit: 50, page: 3 });
  assert.equal(urls[0].searchParams.get("limit"), "50");
  assert.equal(urls[0].searchParams.get("offset"), "100");
  assert.equal(urls[0].searchParams.has("page"), false);
});

test("listUsers maps snake_case fields to camelCase", async (t) => {
  mockFetch(t);
  assert.deepEqual(await listUsers(DEFAULT_USERS_QUERY), {
    items: [{
      id: validUser.id,
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      role: "resident",
      assetIds: ["A-100", "A-200"],
      createdAt: "2026-10-01T15:30:00Z",
    }],
    total: 1,
    limit: 25,
    offset: 0,
  });
});

test("parseAdminUserList accepts an empty page", () => {
  assert.deepEqual(parseAdminUserList({ items: [], total: 0, limit: 25, offset: 0 }).items, []);
});

const malformed = {
  "a non-object payload": null,
  "an array payload": [],
  "missing items": { total: 0, limit: 25, offset: 0 },
  "a string total": { ...validList, total: "1" },
  "a negative offset": { ...validList, offset: -1 },
  "an unknown role": { ...validList, items: [{ ...validUser, role: "superuser" }] },
  "a missing email": { ...validList, items: [{ ...validUser, email: undefined }] },
  "a numeric asset ID": { ...validList, items: [{ ...validUser, asset_ids: [100] }] },
  "asset IDs that are not a list": { ...validList, items: [{ ...validUser, asset_ids: "A-100" }] },
  "an unparseable created_at": { ...validList, items: [{ ...validUser, created_at: "yesterday" }] },
};

for (const [name, payload] of Object.entries(malformed)) {
  test(`parseAdminUserList rejects ${name}`, () => {
    assert.throws(() => parseAdminUserList(payload), ResponseFormatError);
  });
}

for (const status of [401, 403, 422]) {
  test(`listUsers propagates HTTP ${status} as ApiError`, async (t) => {
    mockFetch(t, Response.json({ detail: "Nope" }, { status }));
    await assert.rejects(listUsers(DEFAULT_USERS_QUERY), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      return true;
    });
  });
}
