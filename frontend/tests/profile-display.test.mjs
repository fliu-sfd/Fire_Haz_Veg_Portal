import assert from "node:assert/strict";
import { test } from "node:test";
import { accountFacts, joinedLabel } from "@/features/profile/utils/display";

const profile = {
  id: "u1",
  fullName: "Frank Ortiz",
  email: "frank@example.com",
  phone: null,
  role: "firefighter",
  emailVerified: false,
  createdAt: "2026-10-07T15:30:00Z",
  lastLoginAt: null,
  assetIds: [],
  firefighter: { employeeId: "E100", stationCode: "616C" },
};

test("joinedLabel uses Phoenix time", () => {
  assert.equal(joinedLabel("2026-10-07T15:30:00Z"), "Joined Oct 7, 2026");
  assert.equal(joinedLabel("2026-10-08T03:30:00Z"), "Joined Oct 7, 2026");
});

test("accountFacts shows Never for a user who has not signed in", () => {
  assert.deepEqual(accountFacts(profile, "UTC"), [
    { label: "Role", value: "Firefighter" },
    { label: "Email verified", value: "No" },
    { label: "Last sign-in", value: "Never" },
    { label: "Member since", value: "Oct 7, 2026", dateTime: "2026-10-07T15:30:00Z" },
  ]);
});

test("accountFacts formats the last sign-in", () => {
  const facts = accountFacts({ ...profile, emailVerified: true, lastLoginAt: "2026-10-20T15:30:00Z" }, "UTC");
  assert.equal(facts[1].value, "Yes");
  assert.deepEqual(facts[2], {
    label: "Last sign-in",
    value: "October 20, 2026 at 3:30 PM",
    dateTime: "2026-10-20T15:30:00Z",
  });
});
