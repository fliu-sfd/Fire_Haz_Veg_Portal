import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  dateRangeProblem,
  formatDateRange,
  isCalendarDate,
  matchingPreset,
  presetRange,
  relativeAge,
  todayInReportingZone,
} from "@/features/hazards/utils/dates";

test("isCalendarDate accepts only real YYYY-MM-DD dates", () => {
  assert.equal(isCalendarDate("2026-06-24"), true);
  assert.equal(isCalendarDate("2028-02-29"), true);
  for (const bad of ["2026-02-30", "2026-13-01", "2026-6-1", "06/24/2026", "2026-06-24T00:00", "", null, 20260624]) {
    assert.equal(isCalendarDate(bad), false, String(bad));
  }
});

test("today follows the Phoenix calendar, not UTC", () => {
  // 06:30 UTC on June 10 is still 23:30 on June 9 in Phoenix.
  assert.equal(todayInReportingZone(new Date("2026-06-10T06:30:00Z")), "2026-06-09");
  assert.equal(todayInReportingZone(new Date("2026-06-10T07:05:00Z")), "2026-06-10");
});

test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("presets become absolute Phoenix dates", () => {
  const lateEvening = new Date("2026-06-10T06:30:00Z");
  assert.deepEqual(presetRange("last7", lateEvening), { from: "2026-06-03", to: "2026-06-09" });
  assert.deepEqual(presetRange("last30", lateEvening), { from: "2026-05-11", to: "2026-06-09" });
  assert.deepEqual(presetRange("older30", lateEvening), { from: null, to: "2026-05-09" });
  const justAfterMidnight = new Date("2026-06-10T07:05:00Z");
  assert.deepEqual(presetRange("last7", justAfterMidnight), { from: "2026-06-04", to: "2026-06-10" });
});

test("explains a bad custom range", () => {
  assert.equal(dateRangeProblem("2026-06-01", "2026-06-24"), null);
  assert.equal(dateRangeProblem("", ""), null);
  assert.equal(dateRangeProblem("2026-02-30", ""), "invalid_from");
  assert.equal(dateRangeProblem("", "June"), "invalid_to");
  assert.equal(dateRangeProblem("2026-06-24", "2026-06-01"), "reversed");
});

test("formats date ranges for chips", () => {
  assert.equal(formatDateRange({ from: "2026-06-01", to: "2026-06-24" }), "Jun 1 to Jun 24, 2026");
  assert.equal(formatDateRange({ from: "2025-12-20", to: "2026-01-05" }), "Dec 20, 2025 to Jan 5, 2026");
  assert.equal(formatDateRange({ from: "2026-06-01", to: null }), "from Jun 1, 2026");
  assert.equal(formatDateRange({ from: null, to: "2026-05-09" }), "up to May 9, 2026");
});

test("relative age text", () => {
  assert.equal(relativeAge(0), "Today");
  assert.equal(relativeAge(1), "1 day ago");
  assert.equal(relativeAge(12), "12 days ago");
  assert.equal(relativeAge(1200), "1,200 days ago");
  assert.equal(relativeAge(null), "Not recorded");
});

test("recognizes which preset a range came from", () => {
  const now = new Date("2026-06-10T18:00:00Z");
  assert.equal(matchingPreset({ from: null, to: null }, now), null);
  assert.equal(matchingPreset({ from: "2026-06-04", to: "2026-06-10" }, now), "last7");
  assert.equal(matchingPreset({ from: null, to: "2026-05-10" }, now), "older30");
  assert.equal(matchingPreset({ from: "2026-06-01", to: "2026-06-10" }, now), "custom");
});
