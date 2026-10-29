import assert from "node:assert/strict";
import { test } from "node:test";
import { changePassword, getProfile, parseProfile, updateProfile } from "@/features/profile/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const validProfile = {
  id: "8f9d2a8e-7b1c-4d7e-9a43-0c2f7f1e5b6a",
  full_name: "Frank Ortiz",
  email: "frank@example.com",
  phone: "480-555-0100",
  role: "firefighter",
  email_verified: false,
  created_at: "2026-10-07T15:30:00Z",
  last_login_at: null,
  asset_ids: [],
  firefighter: { employee_id: "E100", station_code: null },
};

function mockRequests(t, response = Response.json(validProfile)) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url: new URL(url), method: init.method ?? "GET", body: init.body, credentials: init.credentials });
    return response.clone();
  });
  return requests;
}

test("getProfile maps the profile to camelCase", async (t) => {
  const requests = mockRequests(t);
  assert.deepEqual(await getProfile(), {
    id: validProfile.id,
    fullName: "Frank Ortiz",
    email: "frank@example.com",
    phone: "480-555-0100",
    role: "firefighter",
    emailVerified: false,
    createdAt: "2026-10-07T15:30:00Z",
    lastLoginAt: null,
    assetIds: [],
    firefighter: { employeeId: "E100", stationCode: null },
  });
  assert.match(requests[0].url.pathname, /\/me\/profile$/);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].credentials, "include");
});

test("parseProfile accepts a resident with properties and no firefighter details", () => {
  const profile = parseProfile({ ...validProfile, role: "resident", asset_ids: ["1690011", "1732983"], firefighter: null });
  assert.deepEqual(profile.assetIds, ["1690011", "1732983"]);
  assert.equal(profile.firefighter, null);
});

const malformed = {
  "a non-object": "profile",
  "a missing id": { ...validProfile, id: undefined },
  "a numeric full_name": { ...validProfile, full_name: 7 },
  "a missing email": { ...validProfile, email: undefined },
  "a missing phone": { ...validProfile, phone: undefined },
  "an unknown role": { ...validProfile, role: "chief" },
  "a string email_verified": { ...validProfile, email_verified: "no" },
  "an unparseable created_at": { ...validProfile, created_at: "yesterday" },
  "an unparseable last_login_at": { ...validProfile, last_login_at: "never" },
  "non-string asset_ids": { ...validProfile, asset_ids: [1732983] },
  "a missing firefighter": { ...validProfile, firefighter: undefined },
  "a firefighter without employee_id": { ...validProfile, firefighter: { station_code: "616C" } },
  "a numeric station_code": { ...validProfile, firefighter: { employee_id: "E1", station_code: 616 } },
};

for (const [name, payload] of Object.entries(malformed)) {
  test(`parseProfile rejects ${name}`, () => {
    const data = typeof payload === "object" ? JSON.parse(JSON.stringify(payload)) : payload;
    assert.throws(() => parseProfile(data), ResponseFormatError);
  });
}

test("updateProfile sends only the given fields in snake_case", async (t) => {
  const requests = mockRequests(t);
  await updateProfile({ fullName: "Frank Ortiz Jr.", phone: null });
  assert.equal(requests[0].method, "PATCH");
  assert.match(requests[0].url.pathname, /\/me\/profile$/);
  assert.deepEqual(JSON.parse(requests[0].body), { full_name: "Frank Ortiz Jr.", phone: null });
});

test("updateProfile leaves out fields that were not given", async (t) => {
  const requests = mockRequests(t);
  await updateProfile({ phone: "480-555-0111" });
  assert.deepEqual(JSON.parse(requests[0].body), { phone: "480-555-0111" });
});

test("updateProfile rejects a malformed response", async (t) => {
  mockRequests(t, Response.json({ ok: true }));
  await assert.rejects(updateProfile({ phone: null }), ResponseFormatError);
});

test("changePassword posts snake_case fields and resolves on 204", async (t) => {
  const requests = mockRequests(t, new Response(null, { status: 204 }));
  assert.equal(await changePassword({ currentPassword: " old pass ", newPassword: "Ember&Ridge4471" }), undefined);
  assert.equal(requests[0].method, "POST");
  assert.match(requests[0].url.pathname, /\/me\/password$/);
  // passwords are never trimmed and never sent in the URL
  assert.deepEqual(JSON.parse(requests[0].body), { current_password: " old pass ", new_password: "Ember&Ridge4471" });
  assert.equal(requests[0].url.search, "");
});

test("changePassword rejects a response with a body", async (t) => {
  mockRequests(t, Response.json({ ok: true }));
  await assert.rejects(changePassword({ currentPassword: "a", newPassword: "b" }), ResponseFormatError);
});

test("changePassword propagates a wrong current password as ApiError 400", async (t) => {
  const detail = { detail: { code: "wrong_current_password", message: "Nope", field: "current_password" } };
  mockRequests(t, Response.json(detail, { status: 400 }));
  await assert.rejects(changePassword({ currentPassword: "a", newPassword: "b" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.deepEqual(error.detail, detail);
    return true;
  });
});
