import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getUser,
  linkAsset,
  listUsers,
  parseAdminUserDetail,
  parseAdminUserList,
  unlinkAsset,
  updateUser,
} from "@/features/admin/api";
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
  is_active: true,
  last_login_at: null,
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
      isActive: true,
      lastLoginAt: null,
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
  "a missing is_active": { ...validList, items: [{ ...validUser, is_active: undefined }] },
  "a string is_active": { ...validList, items: [{ ...validUser, is_active: "true" }] },
  "an unparseable last_login_at": { ...validList, items: [{ ...validUser, last_login_at: "never" }] },
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

const validDetail = {
  id: validUser.id,
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: null,
  role: "firefighter",
  is_active: true,
  email_verified: false,
  created_at: "2026-10-01T15:30:00Z",
  last_login_at: "2026-10-20T08:00:00Z",
  asset_ids: [],
  firefighter: { employee_id: "E100", station_code: "616C" },
};

function mockRequests(t, response = Response.json(validDetail)) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url: new URL(url), method: init.method ?? "GET", body: init.body });
    return response.clone();
  });
  return requests;
}

test("getUser maps the detail to camelCase", async (t) => {
  const requests = mockRequests(t);
  assert.deepEqual(await getUser(validUser.id), {
    id: validUser.id,
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    role: "firefighter",
    isActive: true,
    emailVerified: false,
    createdAt: "2026-10-01T15:30:00Z",
    lastLoginAt: "2026-10-20T08:00:00Z",
    assetIds: [],
    firefighter: { employeeId: "E100", stationCode: "616C" },
  });
  assert.match(requests[0].url.pathname, new RegExp(`/admin/users/${validUser.id}$`));
});

test("updateUser sends only the given fields in snake_case", async (t) => {
  const requests = mockRequests(t);
  await updateUser("u1", { fullName: "Ada King", phone: null, isActive: false });
  assert.equal(requests[0].method, "PATCH");
  assert.deepEqual(JSON.parse(requests[0].body), { full_name: "Ada King", phone: null, is_active: false });
});

test("updateUser converts firefighter details", async (t) => {
  const requests = mockRequests(t);
  await updateUser("u1", { role: "firefighter", firefighter: { employeeId: "E1", stationCode: null } });
  assert.deepEqual(JSON.parse(requests[0].body), {
    role: "firefighter",
    firefighter: { employee_id: "E1", station_code: null },
  });
});

test("linkAsset and unlinkAsset encode path parts", async (t) => {
  const requests = mockRequests(t);
  await linkAsset("a/b", "1732983");
  await unlinkAsset("a/b", "X 1/2");
  assert.equal(requests[0].method, "POST");
  assert.match(requests[0].url.pathname, /\/admin\/users\/a%2Fb\/assets$/);
  assert.deepEqual(JSON.parse(requests[0].body), { asset_id: "1732983" });
  assert.equal(requests[1].method, "DELETE");
  assert.match(requests[1].url.pathname, /\/admin\/users\/a%2Fb\/assets\/X%201%2F2$/);
});

const malformedDetail = {
  "a non-object payload": null,
  "a missing id": { ...validDetail, id: undefined },
  "a numeric phone": { ...validDetail, phone: 4805550100 },
  "an unknown role": { ...validDetail, role: "chief" },
  "a missing email_verified": { ...validDetail, email_verified: undefined },
  "an unparseable last_login_at": { ...validDetail, last_login_at: "soon" },
  "asset IDs that are not strings": { ...validDetail, asset_ids: [1] },
  "a missing firefighter": { ...validDetail, firefighter: undefined },
  "a firefighter without employee_id": { ...validDetail, firefighter: { station_code: "616C" } },
  "a numeric station_code": { ...validDetail, firefighter: { employee_id: "E1", station_code: 616 } },
};

for (const [name, payload] of Object.entries(malformedDetail)) {
  test(`parseAdminUserDetail rejects ${name}`, () => {
    assert.throws(() => parseAdminUserDetail(payload), ResponseFormatError);
  });
}

test("parseAdminUserDetail accepts a user with no firefighter details", () => {
  assert.equal(parseAdminUserDetail({ ...validDetail, firefighter: null }).firefighter, null);
});
