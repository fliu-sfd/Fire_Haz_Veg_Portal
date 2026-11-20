import assert from "node:assert/strict";
import { test } from "node:test";
import { getReviewDetail, getReviewInbox, parseReviewInbox, pendingReviewCount, saveReview } from "@/features/reviews/api";
import { ResponseFormatError } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/client";

const item = {
  submission_id: "submission-1", assessment_id: "assessment-1", asset_id: "A-1",
  site_address: "Demo property", homeowner_name: "Demo Homeowner", photo_count: 2,
  created_at: "2026-11-04T16:00:00Z", updated_at: null,
  inspected_at: "2026-10-28T16:00:00Z", inspection_comments: "Trim this vegetation",
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
  assert.equal(parsed.items[0].inspectionComments, "Trim this vegetation");
  assert.equal(parsed.items[0].inspectedAt, item.inspected_at);
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
  "invalid inspection date": { ...inbox, items: [{ ...item, inspected_at: "invalid" }] },
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

const detail = {
  asset_id: "A-1", season_year: 2026, homeowner_name: "Demo Homeowner",
  inspection: {
    id: "assessment-1", status: "ISSUES", comments: "Trim this vegetation",
    inspected_at: item.inspected_at, inspection_type: "Vegetation", site_address: null,
    photos: [{ id: "crew-photo", file_name: "original.png", content_type: "image/png", size_bytes: 100 }],
    submission_status: "approved",
  },
  submission: approved, history: [approved],
};

test("review detail loads the selected submission and both photo sets privately", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/admin\/submissions\/submission-1$/);
    assert.equal(options.credentials, "include");
    return Response.json(detail);
  });
  const result = await getReviewDetail("submission-1");
  assert.equal(result.inspection.photos[0].id, "crew-photo");
  assert.equal(result.submission.photos[0].id, "photo-1");
  assert.equal(result.inspection.comments, "Trim this vegetation");
  assert.equal(result.history[0].reviewComment, "Verified");
});

for (const [name, payload] of Object.entries({
  "different selected submission": { ...detail, submission: { ...approved, id: "another" } },
  "different inspection": { ...detail, inspection: { ...detail.inspection, id: "another" } },
  "unrelated history": { ...detail, history: [{ ...approved, assessment_id: "another" }] },
  "missing selected history": { ...detail, history: [] },
  "invalid crew photo": { ...detail, inspection: { ...detail.inspection, photos: [{ id: 123 }] } },
})) {
  test(`review detail refuses ${name}`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(payload));
    await assert.rejects(getReviewDetail("submission-1"), ResponseFormatError);
  });
}
