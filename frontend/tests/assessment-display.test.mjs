import assert from "node:assert/strict";
import { test } from "node:test";
import { hasIssues, inspectionDate, nextStep, statusLabel } from "@/features/assessments/utils/display";

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
