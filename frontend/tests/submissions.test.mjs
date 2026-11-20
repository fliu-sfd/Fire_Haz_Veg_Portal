import assert from "node:assert/strict";
import { test } from "node:test";
import { getSubmissions, getSubmissionPhoto, submissionPhotoUrl, submitPhotos, updateSubmission } from "@/features/submissions/api";
import { MAX_PHOTO_BYTES, submissionError, validatePhotos } from "@/features/submissions/utils";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const photo = { id: "photo-id", file_name: "yard.png", content_type: "image/png", size_bytes: 100 };
const submission = {
  id: "submission-id", assessment_id: "assessment-id", comment: "Trimmed the tree",
  status: "pending_review", created_at: "2026-10-29T15:00:00Z", photos: [photo],
  updated_at: null, is_own_submission: true, can_edit: true,
  can_review: false, version: 1, reviewed_at: null, review_comment: null,
};

test("loads evidence for an existing inspection and maps its metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/assessments\/assessment-id\/submissions$/);
    assert.equal(options.credentials, "include");
    return Response.json([submission]);
  });
  const rows = await getSubmissions("assessment-id");
  assert.equal(rows[0].assessmentId, "assessment-id");
  assert.equal(rows[0].photos[0].fileName, "yard.png");
  assert.equal(rows[0].status, "pending_review");
  assert.equal(rows[0].canEdit, true);
  assert.equal(rows[0].isOwnSubmission, true);
});

test("edits the existing submission and preserves saved photos when no replacements are selected", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/assessments\/assessment-id\/submissions\/submission-id$/);
    assert.equal(options.method, "PATCH");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.has("Content-Type"), false);
    assert.equal(options.body.getAll("photos").length, 0);
    assert.equal(options.body.get("comment"), "Updated comment");
    return Response.json({ ...submission, comment: "Updated comment", updated_at: "2026-11-04T16:00:00Z" });
  });
  const result = await updateSubmission("assessment-id", "submission-id", [], " Updated comment ");
  assert.equal(result.id, "submission-id");
  assert.equal(result.updatedAt, "2026-11-04T16:00:00Z");
});

test("an edit can clear the optional comment and replace photos", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.body.get("comment"), "");
    assert.equal(options.body.getAll("photos")[0].name, "replacement.png");
    return Response.json({ ...submission, comment: null });
  });
  await updateSubmission("assessment-id", "submission-id", [new File(["test"], "replacement.png", { type: "image/png" })], "");
});

test("rejects an edit response for a different submission", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...submission, id: "wrong-id" }));
  await assert.rejects(updateSubmission("assessment-id", "submission-id", [], "Updated"), ResponseFormatError);
});

test("photo links use the stable protected route and encode identifiers", () => {
  assert.match(submissionPhotoUrl("photo/id"), /\/api\/v1\/submission-photos\/photo%2Fid$/);
  assert.equal(new URL(submissionPhotoUrl("photo-id")).search, "");
  assert.equal(submissionPhotoUrl("photo-id").includes("blob:"), false);
});

test("sends image files and optional comment as multipart with session cookie", async (t) => {
  const file = new File(["example image bytes"], "yard.png", { type: "image/png" });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/assessments\/assessment-id\/submissions$/);
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.has("Content-Type"), false);
    assert.ok(options.signal instanceof AbortSignal);
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.getAll("photos").length, 1);
    assert.equal(options.body.get("photos").name, "yard.png");
    assert.equal(options.body.get("comment"), "Trimmed the tree");
    return Response.json(submission, { status: 201 });
  });
  const result = await submitPhotos("assessment-id", [file], " Trimmed the tree ");
  assert.equal(result.assessmentId, "assessment-id");
});

test("omits a blank optional comment", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.body.has("comment"), false);
    return Response.json({ ...submission, comment: null });
  });
  await submitPhotos("assessment-id", [new File(["bytes"], "photo.png", { type: "image/png" })], " ");
});

test("retrieves private photo bytes with cookies and cancellation", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/submission-photos\/photo-id$/);
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.get("Accept"), "image/jpeg, image/png");
    assert.equal(options.signal, controller.signal);
    return new Response(new Blob(["private photo"], { type: "image/png" }));
  });
  assert.equal(await (await getSubmissionPhoto("photo-id", controller.signal)).text(), "private photo");
});

for (const [name, payload] of Object.entries({
  "non-list response": {},
  "missing fields": [{ id: "assessment-id" }],
  "wrong assessment linkage": [{ ...submission, assessment_id: "other-id" }],
  "unknown submission status": [{ ...submission, status: "cleared" }],
  "invalid creation date": [{ ...submission, created_at: "invalid" }],
  "missing photos": [{ ...submission, photos: [] }],
  "unsafe photo type": [{ ...submission, photos: [{ ...photo, content_type: "image/svg+xml" }] }],
  "invalid photo size": [{ ...submission, photos: [{ ...photo, size_bytes: -1 }] }],
})) {
  test(`rejects ${name}`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(payload));
    await assert.rejects(getSubmissions("assessment-id"), ResponseFormatError);
  });
}

test("does not report success for another assessment's submission", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...submission, assessment_id: "other-id" }));
  await assert.rejects(submitPhotos("assessment-id", [], ""), ResponseFormatError);
});

const valid = { type: "image/jpeg", size: MAX_PHOTO_BYTES };
test("accepts up to five photos at the exact size limit", () => {
  assert.equal(validatePhotos([valid]), undefined);
  assert.equal(validatePhotos(Array(5).fill(valid)), undefined);
});

for (const [name, files, message] of [
  ["missing", [], /between one and five/],
  ["too many", Array(6).fill(valid), /between one and five/],
  ["wrong type", [{ type: "text/plain", size: 100 }], /JPEG and PNG/],
  ["empty", [{ ...valid, size: 0 }], /not be empty/],
  ["too large", [{ ...valid, size: MAX_PHOTO_BYTES + 1 }], /5 MB/],
]) {
  test(`shows a useful message for ${name} photos`, () => assert.match(validatePhotos(files), message));
}

test("preserves upload HTTP errors for useful messages", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Each photo must be 5 MB or smaller." }, { status: 413 }));
  await assert.rejects(submitPhotos("assessment-id", [], ""), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 413);
    assert.match(submissionError(error), /5 MB/);
    return true;
  });
});

test("session and network errors explain the next step", () => {
  assert.match(submissionError(new ApiError(401, {})), /Sign in again/);
  assert.match(submissionError(new Error("timeout")), /check your submissions before trying again/);
});
