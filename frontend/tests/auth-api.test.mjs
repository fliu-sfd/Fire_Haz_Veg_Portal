import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addMyProperty,
  authErrorMessage,
  getCurrentAccount,
  getMyProperties,
  registerHomeowner,
  removeMyProperty,
  signInProblem,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const signup = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Secure!Pass987",
};

const account = {
  id: "resident-id",
  full_name: signup.full_name,
  email: signup.email,
  role: "resident",
  property_ids: [],
};

for (const role of ["resident", "admin"]) {
  test(`an account with the ${role} role is accepted`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ ...account, role }));
    assert.equal((await getCurrentAccount()).role, role);
  });
}

test("an account with a firefighter role is invalid", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...account, role: "firefighter" }));
  await assert.rejects(getCurrentAccount(), /invalid account/);
});

test("signup sends only name, email and password", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/auth\/signup$/);
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.deepEqual(JSON.parse(options.body), signup);
    return Response.json(account);
  });
  const result = await registerHomeowner({ ...signup, asset_id: "A-100", property_address: "123 Main St" });
  assert.equal(result.fullName, signup.full_name);
  assert.deepEqual(result.propertyIds, []);
});

test("signup displays the API's duplicate email message", async (t) => {
  const detail = "An account with this email already exists.";
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail }, { status: 409 }));
  await assert.rejects(registerHomeowner(signup), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
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
  review_state: "pending_review",
};

test("getMyProperties maps fields and sends the session cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/residents\/me\/properties$/);
    assert.equal(options.credentials, "include");
    return Response.json([property, { ...property, asset_id: "A-200", latest_status: "NO ISSUES" }]);
  });
  assert.deepEqual(await getMyProperties(), [
    { assetId: "A-100", seasonYear: 2026, latestStatus: "ISSUES", latestInspectedAt: property.latest_inspected_at, siteAddress: "123 Main St", reviewState: "pending_review" },
    { assetId: "A-200", seasonYear: 2026, latestStatus: "NO ISSUES", latestInspectedAt: property.latest_inspected_at, siteAddress: "123 Main St", reviewState: "pending_review" },
  ]);
});

test("getMyProperties accepts a linked property with no inspection", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([{
    asset_id: "A-100", season_year: null, latest_status: null, latest_inspected_at: null, site_address: null, review_state: null,
  }]));
  assert.deepEqual(await getMyProperties(), [{
    assetId: "A-100", seasonYear: null, latestStatus: null, latestInspectedAt: null, siteAddress: null, reviewState: null,
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
  "an unknown review state": [{ ...property, review_state: "approved" }],
  "a missing review state": [{ ...property, review_state: undefined }],
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

const parsedProperty = {
  assetId: "A-100",
  seasonYear: 2026,
  latestStatus: "ISSUES",
  latestInspectedAt: property.latest_inspected_at,
  siteAddress: "123 Main St",
  reviewState: "pending_review",
};

test("addMyProperty posts the Asset ID and parses the returned list", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/residents\/me\/properties$/);
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.deepEqual(JSON.parse(options.body), { asset_id: "A-100" });
    return Response.json([property]);
  });
  assert.deepEqual(await addMyProperty("A-100"), [parsedProperty]);
});

test("removeMyProperty deletes by Asset ID and parses the returned list", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/residents\/me\/properties\/A-100$/);
    assert.equal(options.method, "DELETE");
    assert.equal(options.body, undefined);
    return Response.json([property]);
  });
  assert.deepEqual(await removeMyProperty("A-100"), [parsedProperty]);
});

test("removeMyProperty encodes the path part", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.ok(url.endsWith("/residents/me/properties/A%2F1%3Fx%3D1%23y"));
    return Response.json([]);
  });
  assert.deepEqual(await removeMyProperty("A/1?x=1#y"), []);
});

for (const [name, call] of [["addMyProperty", addMyProperty], ["removeMyProperty", removeMyProperty]]) {
  for (const [label, body] of [
    ["a list that is not an array", { items: [] }],
    ["a missing field", [{ asset_id: "A-100" }]],
    ["a wrong-typed field", [{ ...property, season_year: "2026" }]],
  ]) {
    test(`${name} rejects ${label}`, async (t) => {
      t.mock.method(globalThis, "fetch", async () => Response.json(body));
      await assert.rejects(call("A-100"), ResponseFormatError);
    });
  }

  test(`${name} keeps the API error for the caller`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ detail: { code: "already_linked" } }, { status: 409 }));
    await assert.rejects(call("A-100"), (error) => error instanceof ApiError && error.status === 409);
  });
}

test("account_disabled becomes the disabled kind with the message", () => {
  const error = new ApiError(403, { detail: { code: "account_disabled", message: "Call the department." } });
  assert.deepEqual(signInProblem(error), { kind: "disabled", message: "Call the department." });
});

test("a message keeps its line breaks and characters as sent", () => {
  const message = "Line one\n<script>alert(1)</script>";
  const error = new ApiError(403, { detail: { code: "account_disabled", message } });
  assert.equal(signInProblem(error).message, message);
});

test("other sign-in errors become the failed kind", () => {
  assert.deepEqual(signInProblem(new ApiError(401, { detail: "Invalid email or password" })), {
    kind: "failed",
    message: "Invalid email or password",
  });
  const otherCode = new ApiError(403, { detail: { code: "something_else", message: "No." } });
  assert.deepEqual(signInProblem(otherCode), { kind: "failed", message: "No." });
  assert.equal(signInProblem(new TypeError("fetch failed")).kind, "failed");
});

test("a 403 with a plain string detail still works", () => {
  assert.deepEqual(signInProblem(new ApiError(403, { detail: "Account is disabled." })), {
    kind: "failed",
    message: "Account is disabled.",
  });
});
