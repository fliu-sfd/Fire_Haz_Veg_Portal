import assert from "node:assert/strict";
import { test } from "node:test";
import { isUnauthorized, profileError, profileLoadErrorMessage } from "@/features/profile/utils/errors";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const codeError = (status, code, field) =>
  new ApiError(status, { detail: { code, message: "Server message", ...(field ? { field } : {}) } });

const validationError = (field, msg) =>
  new ApiError(422, { detail: [{ loc: ["body", field], msg: `Value error, ${msg}`, type: "value_error" }] });

test("wrong_current_password lands under the current password", () => {
  assert.deepEqual(profileError(codeError(400, "wrong_current_password", "current_password")), {
    field: "currentPassword",
    message: "Your current password is not correct.",
  });
});

test("password_unchanged lands under the new password", () => {
  const { field, message } = profileError(codeError(422, "password_unchanged", "new_password"));
  assert.equal(field, "newPassword");
  assert.match(message, /different from your current one/);
});

test("password_personal lands under the new password", () => {
  assert.deepEqual(profileError(codeError(422, "password_personal", "new_password")), {
    field: "newPassword",
    message: "Password must not contain your name or email.",
  });
});

test("validation errors land under the matching field", () => {
  const cases = {
    full_name: "fullName",
    phone: "phone",
    current_password: "currentPassword",
    new_password: "newPassword",
  };
  for (const [apiField, field] of Object.entries(cases)) {
    assert.deepEqual(profileError(validationError(apiField, "Bad value")), { field, message: "Bad value" });
  }
});

test("a validation error on an unknown field goes to the top alert", () => {
  assert.deepEqual(profileError(validationError("email", "Extra inputs are not permitted")), {
    message: "Extra inputs are not permitted",
  });
});

test("other failures go to the top alert", () => {
  assert.equal(profileError(new ApiError(401, { detail: "Not authenticated" })).field, undefined);
  assert.match(profileError(new ApiError(401, { detail: "Not authenticated" })).message, /session has ended/);
  assert.match(profileError(new ApiError(503, "down")).message, /could not save/);
  assert.match(profileError(new TypeError("fetch failed")).message, /could not reach the server/);
  assert.match(profileError(new ResponseFormatError("bad")).message, /could not read/);
  assert.equal(profileError(new ApiError(400, { detail: "Something else" })).message, "Something else");
});

test("load errors explain what happened", () => {
  assert.match(profileLoadErrorMessage(new ApiError(401, {})), /session has ended/);
  assert.match(profileLoadErrorMessage(new ApiError(500, {})), /could not load your profile/);
  assert.match(profileLoadErrorMessage(new ResponseFormatError("bad")), /could not read/);
  assert.match(profileLoadErrorMessage(new TypeError("fetch failed")), /could not reach the server/);
});

test("isUnauthorized is true only for 401", () => {
  assert.equal(isUnauthorized(new ApiError(401, {})), true);
  assert.equal(isUnauthorized(new ApiError(400, {})), false);
  assert.equal(isUnauthorized(new Error("x")), false);
});
