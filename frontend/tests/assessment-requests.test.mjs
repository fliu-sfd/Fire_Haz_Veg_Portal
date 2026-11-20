import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAssessmentRequest,
  getOpenAssessmentRequest,
  listAssessmentRequests,
  markAssessmentRequestHandled,
  parseAssessmentRequestList,
} from "@/features/assessment-requests/api";
import { assessmentRequestDate, MAX_REQUEST_NOTE_LENGTH } from "@/features/assessment-requests/utils";
import { ResponseFormatError } from "@/lib/api/errors";

const openRequest = {
  id: "request-1",
  asset_id: "TEST-001",
  note: "Please check the back yard.",
  requested_at: "2026-11-04T18:00:00Z",
  status: "open",
  handled_at: null,
};

const adminRequest = {
  ...openRequest,
  homeowner_name: "Demo Resident",
  handled_by_name: null,
};

test("homeowner request API reads the current open request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/residents\/me\/properties\/TEST-001\/assessment-requests\/open$/);
    assert.equal(options.credentials, "include");
    return Response.json(openRequest);
  });
  const result = await getOpenAssessmentRequest("TEST-001");
  assert.equal(result.assetId, "TEST-001");
  assert.equal(result.requestedAt, openRequest.requested_at);
});

test("homeowner request API accepts no open request", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(null));
  assert.equal(await getOpenAssessmentRequest("TEST-001"), null);
});

test("creating a request trims the note and sends null for a blank note", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls += 1;
    assert.match(url, /\/residents\/me\/properties\/TEST-001\/assessment-requests$/);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { note: calls === 1 ? "Please visit" : null });
    return Response.json(openRequest);
  });
  await createAssessmentRequest("TEST-001", "  Please visit  ");
  await createAssessmentRequest("TEST-001", "   ");
});

test("admin list sends the status filter and pagination", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /\/admin\/assessment-requests\?limit=25&offset=25&status=handled$/);
    return Response.json({ items: [adminRequest], total: 1, limit: 25, offset: 25 });
  });
  const result = await listAssessmentRequests("handled", 25);
  assert.equal(result.items[0].homeownerName, "Demo Resident");
});

test("admin list leaves the status filter out for all requests", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /\/admin\/assessment-requests\?limit=25&offset=0$/);
    assert.doesNotMatch(url, /status=/);
    return Response.json({ items: [], total: 0, limit: 25, offset: 0 });
  });
  await listAssessmentRequests(null);
});

test("mark handled uses the request action endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/admin\/assessment-requests\/request-1\/handle$/);
    assert.equal(options.method, "POST");
    return Response.json({
      ...adminRequest,
      status: "handled",
      handled_at: "2026-11-04T19:00:00Z",
      handled_by_name: "Demo Admin",
    });
  });
  const result = await markAssessmentRequestHandled("request-1");
  assert.equal(result.status, "handled");
  assert.equal(result.handledByName, "Demo Admin");
});

for (const [name, value] of Object.entries({
  "missing items": { total: 0, limit: 25, offset: 0 },
  "invalid total": { items: [], total: -1, limit: 25, offset: 0 },
  "invalid request status": { items: [{ ...adminRequest, status: "pending" }], total: 1, limit: 25, offset: 0 },
  "missing homeowner": { items: [{ ...adminRequest, homeowner_name: null }], total: 1, limit: 25, offset: 0 },
  "invalid date": { items: [{ ...adminRequest, requested_at: "today" }], total: 1, limit: 25, offset: 0 },
})) {
  test(`assessment request list rejects ${name}`, () => {
    assert.throws(() => parseAssessmentRequestList(value), ResponseFormatError);
  });
}

test("request dates use Phoenix time and note length matches the API", () => {
  assert.match(assessmentRequestDate("2026-11-04T18:00:00Z"), /Nov 4, 2026/);
  assert.equal(MAX_REQUEST_NOTE_LENGTH, 2000);
});
