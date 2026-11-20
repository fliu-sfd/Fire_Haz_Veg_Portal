import assert from "node:assert/strict";
import { test } from "node:test";
import { editError, userLoadErrorMessage } from "@/features/admin/utils/errors";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const ruleError = (status, code, field) =>
  new ApiError(status, { detail: { code, message: "Server text", ...(field ? { field } : {}) } });

const fieldCodes = [
  [409, "email_taken", "email"],
  [404, "property_not_found", "assetId"],
];

for (const [status, code, field] of fieldCodes) {
  test(`${code} is shown under ${field}`, () => {
    const result = editError(ruleError(status, code));
    assert.equal(result.field, field);
    assert.ok(result.message.length > 0);
  });
}

const alertCodes = [
  [409, "last_admin"],
  [409, "unlink_assets_first"],
  [409, "cannot_change_own_access"],
  [409, "assets_residents_only"],
  [404, "user_not_found"],
];

for (const [status, code] of alertCodes) {
  test(`${code} is shown as a form alert`, () => {
    const result = editError(ruleError(status, code));
    assert.equal(result.field, undefined);
    assert.notEqual(result.message, "Server text");
  });
}

test("a schema error is placed under its field", () => {
  const error = new ApiError(422, {
    detail: [{ loc: ["body", "phone"], msg: "Value error, Phone must have 10 to 15 digits" }],
  });
  assert.deepEqual(editError(error), { field: "phone", message: "Phone must have 10 to 15 digits" });
});

test("a schema error on the whole body goes to the alert", () => {
  const error = new ApiError(422, { detail: [{ loc: ["body"], msg: "Value error, Send at least one field to change" }] });
  assert.deepEqual(editError(error), { message: "Send at least one field to change" });
});

test("network failures, server errors and bad responses go to the alert", () => {
  for (const error of [new TypeError("fetch failed"), new ApiError(500, "boom"), new ResponseFormatError("bad")]) {
    const result = editError(error);
    assert.equal(result.field, undefined);
    assert.ok(result.message.length > 0);
  }
});

test("load errors explain a missing or invalid user", () => {
  assert.match(userLoadErrorMessage(new ApiError(404, {})), /no longer exists/);
  assert.match(userLoadErrorMessage(new ApiError(422, {})), /valid user/);
});
