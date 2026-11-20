import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessmentErrorMessage,
  crewPhotoUrl,
  getPropertyAssessment,
  parsePropertyAssessment,
} from "@/features/assessments/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const response = {
  asset_id: "ASSET-1",
  season_year: 2026,
  site_address: "1 Desert Road",
  inspections: [
    {
      id: "inspection-1",
      status: "ISSUES",
      comments: "Trim vegetation near the wall.",
      inspected_at: "2026-10-20T16:30:00Z",
      inspection_type: "NAOS",
      site_address: "1 Desert Road",
      photos: [
        {
          id: "photo-1",
          file_name: "north-yard.jpg",
          content_type: "image/jpeg",
          size_bytes: 4096,
        },
      ],
    },
  ],
};

test("getPropertyAssessment maps the backend response and encodes the Asset ID", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(new URL(url).pathname, /\/assessments\/ASSET%20ONE$/);
    assert.equal(options.credentials, "include");
    return Response.json(response);
  });

  const result = await getPropertyAssessment("ASSET ONE");
  assert.equal(result.assetId, "ASSET-1");
  assert.equal(result.inspections[0].inspectionType, "NAOS");
  assert.deepEqual(result.inspections[0].photos[0], {
    id: "photo-1",
    fileName: "north-yard.jpg",
    contentType: "image/jpeg",
    sizeBytes: 4096,
  });
});

test("crewPhotoUrl builds the protected photo URL", () => {
  assert.match(crewPhotoUrl("photo id"), /\/api\/v1\/assessments\/photos\/photo%20id$/);
});

const invalidResponses = {
  "a missing Asset ID": { ...response, asset_id: undefined },
  "an empty Asset ID": { ...response, asset_id: " " },
  "a string season": { ...response, season_year: "2026" },
  "a missing inspection list": { ...response, inspections: undefined },
  "an invalid inspection date": {
    ...response,
    inspections: [{ ...response.inspections[0], inspected_at: "not-a-date" }],
  },
  "a non-image photo": {
    ...response,
    inspections: [{
      ...response.inspections[0],
      photos: [{ ...response.inspections[0].photos[0], content_type: "text/plain" }],
    }],
  },
};

for (const [name, payload] of Object.entries(invalidResponses)) {
  test(`parsePropertyAssessment rejects ${name}`, () => {
    assert.throws(() => parsePropertyAssessment(payload), ResponseFormatError);
  });
}

test("assessmentErrorMessage gives a clear not-found message", () => {
  assert.equal(
    assessmentErrorMessage(new ApiError(404, { detail: "Assessment not found" })),
    "We could not find an assessment for this property.",
  );
});
