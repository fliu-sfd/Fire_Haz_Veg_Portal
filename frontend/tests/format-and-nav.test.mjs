import assert from "node:assert/strict";
import { test } from "node:test";
import { activeNavHref, navGroupsFor } from "@/components/layout/nav";
import { formatDate, formatTimestamp, initials, resultRange, splitAssetIds } from "@/features/admin/utils/format";
import { areaRedirect, homePathFor } from "@/features/auth/utils/access";

test("initials use the first two name parts", () => {
  assert.equal(initials("Ada Lovelace"), "AL");
  assert.equal(initials("  grace   brewster murray hopper "), "GB");
  assert.equal(initials("Cher"), "C");
  assert.equal(initials(""), "");
});

test("splitAssetIds shows the first few and counts the rest", () => {
  assert.deepEqual(splitAssetIds(["A", "B", "C", "D"]), { shown: ["A", "B"], hidden: ["C", "D"] });
  assert.deepEqual(splitAssetIds(["A"]), { shown: ["A"], hidden: [] });
  assert.deepEqual(splitAssetIds([]), { shown: [], hidden: [] });
  assert.deepEqual(splitAssetIds(["A", "B", "C"], 3), { shown: ["A", "B", "C"], hidden: [] });
});

test("formats dates in the given time zone", () => {
  assert.equal(formatDate("2026-10-01T15:30:00Z", "UTC"), "Oct 1, 2026");
  assert.equal(formatDate("2026-10-01T03:30:00Z", "America/Phoenix"), "Sep 30, 2026");
  assert.equal(formatTimestamp("2026-10-01T15:30:00Z", "UTC"), "October 1, 2026 at 3:30 PM");
});

test("resultRange describes the visible slice", () => {
  assert.deepEqual(resultRange(0, 25, 120), { from: 1, to: 25, total: 120 });
  assert.deepEqual(resultRange(100, 20, 120), { from: 101, to: 120, total: 120 });
  assert.deepEqual(resultRange(0, 0, 0), { from: 0, to: 0, total: 0 });
});

const groups = [
  { id: "general", items: [{ label: "Home", href: homePathFor, icon: "home" }] },
  { id: "admin", label: "Admin", requiredRole: "admin", items: [{ label: "Users", href: "/dashboard/users", icon: "users" }] },
];

test("admins see the admin group", () => {
  assert.deepEqual(
    navGroupsFor(groups, "admin").map((group) => [group.id, group.items.map((item) => item.href)]),
    [["general", ["/dashboard"]], ["admin", ["/dashboard/users"]]],
  );
});

test("firefighters and residents do not see the admin group", () => {
  assert.deepEqual(navGroupsFor(groups, "firefighter").map((group) => group.id), ["general"]);
  const resident = navGroupsFor(groups, "resident");
  assert.deepEqual(resident.map((group) => group.id), ["general"]);
  assert.equal(resident[0].items[0].href, "/homeowner");
});

test("the deepest matching nav item is active", () => {
  const hrefs = ["/dashboard", "/dashboard/users"];
  assert.equal(activeNavHref("/dashboard", hrefs), "/dashboard");
  assert.equal(activeNavHref("/dashboard/users", hrefs), "/dashboard/users");
  assert.equal(activeNavHref("/dashboard/users/123", hrefs), "/dashboard/users");
  assert.equal(activeNavHref("/dashboards", hrefs), undefined);
});

test("areaRedirect keeps residents and staff in their own areas", () => {
  assert.equal(areaRedirect("resident", "/dashboard/users"), "/homeowner");
  assert.equal(areaRedirect("admin", "/homeowner"), "/dashboard");
  assert.equal(areaRedirect("firefighter", "/dashboard/users"), null);
  assert.equal(areaRedirect("resident", "/homeowner"), null);
});
