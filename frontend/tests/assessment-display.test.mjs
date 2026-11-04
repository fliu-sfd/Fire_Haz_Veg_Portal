import assert from "node:assert/strict";
import { test } from "node:test";
import { hasIssues, inspectionDate, inspectionProgress, isReviewState, nextStep, propertyProgress, reviewStateLine, statusLabel } from "@/features/assessments/utils/display";

const inspection = {
  id: "inspection-1",
  status: "ISSUES",
  comments: "Trim vegetation.",
  inspectedAt: "2026-10-20T23:30:00Z",
  inspectionType: "NAOS",
  siteAddress: "1 Desert Road",
  photos: [],
};

test("hasIssues reports whether any inspection point needs action", () => {
  assert.equal(hasIssues({ assetId: "A-1", seasonYear: 2026, siteAddress: null, inspections: [inspection] }), true);
  assert.equal(hasIssues({
    assetId: "A-1",
    seasonYear: 2026,
    siteAddress: null,
    inspections: [{ ...inspection, status: "NO ISSUES" }],
  }), false);
});

test("statusLabel uses homeowner-friendly labels", () => {
  assert.equal(statusLabel("ISSUES"), "Action needed");
  assert.equal(statusLabel("NO ISSUES"), "No issues found");
  assert.equal(statusLabel("PENDING_REVIEW"), "Pending review");
});

test("inspectionDate displays a Phoenix calendar date", () => {
  assert.equal(inspectionDate("2026-10-20T23:30:00Z"), "Oct 20, 2026");
  assert.equal(inspectionDate(null), "Date not recorded");
});

test("nextStep relies on crew notes and does not invent missing instructions", () => {
  assert.match(nextStep(inspection), /inspection notes/);
  assert.match(nextStep({ ...inspection, comments: null }), /Contact Fire Prevention/);
  assert.match(nextStep({ ...inspection, status: "NO ISSUES" }), /No corrective work/);
});

test("a saved pending submission completes the homeowner step while keeping department verification pending", () => {
  const submitted = { ...inspection, submissionStatus: "pending_review" };
  assert.equal(inspectionProgress(submitted), "pending_review");
  assert.match(nextStep(submitted), /submission step is complete/);
  assert.match(nextStep(submitted), /verification is pending/);
  assert.equal(submitted.status, "ISSUES");
});

test("property progress still requires action if another inspection has no evidence", () => {
  const assessment = { inspections: [{ ...inspection, submissionStatus: "pending_review" }, inspection] };
  assert.equal(propertyProgress(assessment), "action_needed");
  assert.equal(propertyProgress({ inspections: [assessment.inspections[0]] }), "pending_review");
  assert.equal(propertyProgress({ inspections: [{ ...inspection, submissionStatus: "rejected" }] }), "action_needed");
  assert.equal(propertyProgress({ inspections: [{ ...inspection, submissionStatus: "approved" }] }), "approved");
});

test("isReviewState accepts only the three states the API sends", () => {
  for (const ok of ["open", "pending_review", "closed"]) assert.equal(isReviewState(ok), true);
  for (const bad of ["approved", "rejected", "OPEN", "", null, undefined, 1]) assert.equal(isReviewState(bad), false);
});

test("reviewStateLine gives a property card one plain sentence per state", () => {
  assert.equal(reviewStateLine("open"), "Completion photos are still needed.");
  assert.equal(reviewStateLine("pending_review"), "Photos submitted. Waiting for department review.");
  assert.equal(reviewStateLine("closed"), "Approved by the department.");
});

test("reviewStateLine shows nothing for a property without an issue", () => {
  assert.equal(reviewStateLine(null), null);
});
