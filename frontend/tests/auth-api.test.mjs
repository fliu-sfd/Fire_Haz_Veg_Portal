import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage, registerHomeowner } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";

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
