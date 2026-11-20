import assert from "node:assert/strict";
import { test } from "node:test";
import { propertyErrorMessage, removePropertyConfirmation } from "@/features/auth/utils/properties";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { normalizeAssetId, validateAssetId } from "@/lib/validation/asset-id";

test("normalizeAssetId trims and uppercases", () => {
  assert.equal(normalizeAssetId("  naos-77b "), "NAOS-77B");
});

for (const value of ["1732983", " a-1 ", "NAOS_77-b", "x".repeat(32)]) {
  test(`validateAssetId accepts ${JSON.stringify(value)}`, () => {
    assert.equal(validateAssetId(value), undefined);
  });
}

for (const [name, value, message] of [
  ["empty", "", /Enter/],
  ["only spaces", "   ", /Enter/],
  ["too long", "x".repeat(33), /at most 32/],
  ["a space inside", "A 1", /Use only/],
  ["symbols", "A/1?", /Use only/],
]) {
  test(`validateAssetId rejects ${name}`, () => {
    assert.match(validateAssetId(value), message);
  });
}

const apiError = (status, detail) => new ApiError(status, { detail });

for (const [code, status, field, message] of [
  ["property_not_found", 404, "assetId", /could not find that Asset ID/],
  ["already_linked", 409, "assetId", /already on your account/],
  ["too_many_properties", 409, undefined, /up to 25 properties/],
  ["link_not_allowed", 409, "assetId", /cannot be added/],
]) {
  test(`propertyErrorMessage places ${code}`, () => {
    const result = propertyErrorMessage(apiError(status, { code, message: "server text" }));
    assert.equal(result.field, field);
    assert.match(result.message, message);
  });
}

test("a validation error lands on the field with fixed text", () => {
  const detail = [{ loc: ["body", "asset_id"], msg: "Value error, raw server text" }];
  const result = propertyErrorMessage(apiError(422, detail));
  assert.equal(result.field, "assetId");
  assert.doesNotMatch(result.message, /raw server text/);
});

for (const [name, error, message] of [
  ["a signed-out session", apiError(401, "Not authenticated"), /session has ended/],
  ["an admin account", apiError(403, "Resident access required"), /homeowner accounts/],
  ["an unknown code", apiError(409, { code: "something_new", message: "raw server text" }), /could not save/],
  ["a code from Object.prototype", apiError(409, { code: "constructor" }), /could not save/],
  ["a server failure", apiError(500, "raw server text"), /could not save/],
  ["a network failure", new TypeError("Failed to fetch"), /could not reach/],
  ["an unreadable response", new ResponseFormatError("bad list"), /could not read/],
]) {
  test(`${name} gets a friendly top alert`, () => {
    const result = propertyErrorMessage(error);
    assert.equal(result.field, undefined);
    assert.match(result.message, message);
    assert.doesNotMatch(result.message, /raw server text/);
  });
}

test("removing a property asks first and says it can be added back", () => {
  assert.deepEqual(removePropertyConfirmation("A-100"), {
    title: "Remove A-100 from your account?",
    description: "You can add it again later with the same Asset ID.",
    actionLabel: "Remove property",
    destructive: true,
  });
});
