import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage, getMyProperties, registerHomeowner } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const signup = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  asset_id: "A-100",
  password: "Secure!Pass987",
};

const account = {
  id: "resident-id",
  full_name: signup.full_name,
  email: signup.email,
  role: "resident",
  property_ids: [signup.asset_id],
};

for (const address of [undefined, "", "   "]) {
  test(`signup omits an optional address (${JSON.stringify(address)})`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.match(new URL(url).pathname, /\/auth\/signup$/);
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "include");
      assert.deepEqual(JSON.parse(options.body), signup);
      return Response.json(account);
    });
    const result = await registerHomeowner({ ...signup, property_address: address });
    assert.equal(result.fullName, signup.full_name);
    assert.deepEqual(result.propertyIds, [signup.asset_id]);
  });
}

test("signup sends a filled address with surrounding whitespace removed", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { ...signup, property_address: "123 Main St" });
    return Response.json(account);
  });
  await registerHomeowner({ ...signup, property_address: " 123 Main St " });
});

test("signup displays the API's unknown Asset ID message", async (t) => {
  const detail = "We could not find that Asset ID. Check the number on your door tag.";
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail }, { status: 404 }));
  await assert.rejects(registerHomeowner(signup), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(authErrorMessage(error), detail);
    return true;
  });
});

const property = {
  asset_id: "A-100",
  season_year: 2026,
  latest_status: "ISSUES",
  latest_inspected_at: "2026-10-14T15:30:00Z",
  site_address: "123 Main St",
};

test("getMyProperties maps fields and sends the session cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/residents\/me\/properties$/);
    assert.equal(options.credentials, "include");
    return Response.json([property, { ...property, asset_id: "A-200", latest_status: "NO ISSUES" }]);
  });
  assert.deepEqual(await getMyProperties(), [
    { assetId: "A-100", seasonYear: 2026, latestStatus: "ISSUES", latestInspectedAt: property.latest_inspected_at, siteAddress: "123 Main St" },
    { assetId: "A-200", seasonYear: 2026, latestStatus: "NO ISSUES", latestInspectedAt: property.latest_inspected_at, siteAddress: "123 Main St" },
  ]);
});

test("getMyProperties accepts a linked property with no inspection", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([{
    asset_id: "A-100", season_year: null, latest_status: null, latest_inspected_at: null, site_address: null,
  }]));
  assert.deepEqual(await getMyProperties(), [{
    assetId: "A-100", seasonYear: null, latestStatus: null, latestInspectedAt: null, siteAddress: null,
  }]);
});

test("getMyProperties accepts an empty list", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await getMyProperties(), []);
});

const invalidProperties = {
  "an object instead of a list": { items: [property] },
  "a null response": null,
  "a null item": [null],
  "a numeric Asset ID": [{ ...property, asset_id: 100 }],
  "an empty Asset ID": [{ ...property, asset_id: " " }],
  "an unknown result": [{ ...property, latest_status: "PASS" }],
  "a string season": [{ ...property, season_year: "2026" }],
  "an invalid date": [{ ...property, latest_inspected_at: "not-a-date" }],
  "a numeric address": [{ ...property, site_address: 123 }],
  "a missing field": [{ asset_id: "A-100" }],
};

for (const [name, payload] of Object.entries(invalidProperties)) {
  test(`getMyProperties rejects ${name}`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(payload));
    await assert.rejects(getMyProperties(), ResponseFormatError);
  });
}

for (const status of [401, 403, 500]) {
  test(`getMyProperties preserves HTTP ${status} for redirect and error handling`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Request refused" }, { status }));
    await assert.rejects(getMyProperties(), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      return true;
    });
  });
}
