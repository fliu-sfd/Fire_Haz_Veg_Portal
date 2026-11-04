import assert from "node:assert/strict";
import { test } from "node:test";
import { getReviewInbox, parseReviewInbox, pendingReviewCount, saveReview } from "@/features/reviews/api";
import { ResponseFormatError } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/client";

const item = {
  submission_id: "submission-1", assessment_id: "assessment-1", asset_id: "A-1",
  site_address: "Demo property", homeowner_name: "Demo Homeowner", photo_count: 2,
  created_at: "2026-11-04T16:00:00Z", updated_at: null,
};
const inbox = { items: [item], total: 1, limit: 25, offset: 0 };
const submission = { id: "submission-1", assessmentId: "assessment-1", version: 3 };
const approved = {
  id: "submission-1", assessment_id: "assessment-1", version: 4,
  comment: "Work completed", status: "approved", created_at: item.created_at, updated_at: null,
  is_own_submission: false, can_edit: false, can_review: false,
  reviewed_at: "2026-11-04T17:00:00Z", review_comment: "Verified",
  photos: [{ id: "photo-1", file_name: "yard.png", content_type: "image/png", size_bytes: 100 }],
};

test("review inbox maps owner, property, times and photo count", () => {
  const parsed = parseReviewInbox(inbox);
  assert.equal(parsed.items[0].homeownerName, "Demo Homeowner");
  assert.equal(parsed.items[0].assetId, "A-1");
  assert.equal(parsed.items[0].photoCount, 2);
});

test("review inbox uses the paginated admin endpoint with session credentials", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/admin\/submissions\?limit=25&offset=25$/);
    assert.equal(options.credentials, "include");
    return Response.json({ ...inbox, offset: 25 });
  });
  await getReviewInbox(25);
});

for (const [name, payload] of Object.entries({
  "non-object": null, "missing items": { total: 1 },
  "invalid count": { ...inbox, total: -1 },
  "missing homeowner": { ...inbox, items: [{ ...item, homeowner_name: null }] },
  "invalid timestamp": { ...inbox, items: [{ ...item, updated_at: "invalid" }] },
  "negative photo count": { ...inbox, items: [{ ...item, photo_count: -1 }] },
})) {
  test(`review inbox rejects ${name}`, () => assert.throws(() => parseReviewInbox(payload), ResponseFormatError));
}

test("pending count validates the notification badge payload", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /\/admin\/submissions\/count$/);
    return Response.json({ pending: 4 });
  });
  assert.equal(await pendingReviewCount(), 4);
});

test("pending count rejects invalid values", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ pending: "four" }));
  await assert.rejects(pendingReviewCount(), ResponseFormatError);
});

test("save decision sends the exact evidence version and returns the department comment", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/admin\/submissions\/submission-1\/review$/);
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.deepEqual(JSON.parse(options.body), { decision: "approved", expected_version: 3, comment: "Verified" });
    return Response.json(approved);
  });
  const result = await saveReview(submission, "approved", " Verified ");
  assert.equal(result.status, "approved");
  assert.equal(result.reviewComment, "Verified");
  assert.equal(result.canEdit, false);
});

test("stale decisions preserve the 409 conflict for a useful refresh message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "The homeowner changed this evidence." }, { status: 409 }));
  await assert.rejects(saveReview(submission, "approved", ""), (error) => error instanceof ApiError && error.status === 409);
});

test("save decision rejects a response for a different submission", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...approved, id: "another-submission" }));
  await assert.rejects(saveReview(submission, "approved", ""), ResponseFormatError);
});
