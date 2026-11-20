import assert from "node:assert/strict";
import { test } from "node:test";
import { messageActionError, messagesLoadError } from "@/features/settings/utils/errors";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

test("a rule failure shows the backend's message", () => {
  const error = new ApiError(422, {
    detail: { code: "invalid_message", message: "Message must be at least 10 characters", field: "message" },
  });
  assert.equal(messageActionError(error), "Message must be at least 10 characters");
});

test("a standard validation error shows its first message", () => {
  const error = new ApiError(422, { detail: [{ loc: ["body", "message"], msg: "Input should be a valid string" }] });
  assert.equal(messageActionError(error), "Input should be a valid string");
});

test("each failed save has plain words", () => {
  assert.match(messageActionError(new ApiError(401, {})), /session has ended/);
  assert.match(messageActionError(new ApiError(403, {})), /administrator access/);
  assert.match(messageActionError(new ApiError(404, { detail: { code: "message_not_found" } })), /no longer exists/);
  assert.match(messageActionError(new ApiError(500, "boom")), /could not save/);
  assert.match(messageActionError(new TypeError("fetch failed")), /could not reach the server/);
  assert.match(messageActionError(new ResponseFormatError("bad")), /could not read/);
});

test("each failed load has plain words", () => {
  assert.match(messagesLoadError(new ApiError(401, {})), /session has ended/);
  assert.match(messagesLoadError(new ApiError(403, {})), /administrator access/);
  assert.match(messagesLoadError(new ApiError(503, "down")), /could not load the settings/);
  assert.match(messagesLoadError(new TypeError("fetch failed")), /could not reach the server/);
  assert.match(messagesLoadError(new ResponseFormatError("bad")), /could not read/);
});
