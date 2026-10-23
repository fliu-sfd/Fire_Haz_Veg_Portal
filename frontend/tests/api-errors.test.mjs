import assert from "node:assert/strict";
import { test } from "node:test";
import { accessProblem, adminErrorMessage } from "@/features/admin/utils/errors";
import { ApiError } from "@/lib/api/client";
import { isRetryableError, ResponseFormatError } from "@/lib/api/errors";

test("does not retry client errors", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assert.equal(isRetryableError(new ApiError(status, null)), false, `status ${status}`);
  }
});

test("retries server and network errors", () => {
  assert.equal(isRetryableError(new ApiError(500, null)), true);
  assert.equal(isRetryableError(new ApiError(503, "Unavailable")), true);
  assert.equal(isRetryableError(new TypeError("Failed to fetch")), true);
});

test("does not retry a malformed response", () => {
  assert.equal(isRetryableError(new ResponseFormatError("bad")), false);
});

test("classifies access problems", () => {
  assert.equal(accessProblem(new ApiError(401, null)), "unauthorized");
  assert.equal(accessProblem(new ApiError(403, null)), "forbidden");
  assert.equal(accessProblem(new ApiError(500, null)), null);
  assert.equal(accessProblem(new TypeError("Failed to fetch")), null);
});

test("maps errors to friendly messages without raw details", () => {
  assert.equal(adminErrorMessage(new ApiError(403, { detail: "x" })), "Administrator access required.");
  assert.match(adminErrorMessage(new ApiError(502, "<html>")), /could not load users/);
  assert.match(adminErrorMessage(new ResponseFormatError("bad")), /could not read/);
  assert.match(adminErrorMessage(new TypeError("Failed to fetch")), /could not reach the service/);
});
