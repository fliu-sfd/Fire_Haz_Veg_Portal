import assert from "node:assert/strict";
import { test } from "node:test";
import { activeNavHref, navGroupsFor } from "@/components/layout/nav";
import { NAV_GROUPS, PROFILE_HREF } from "@/components/layout/nav-config";
import { areaRedirect } from "@/features/auth/utils/access";

const ROLES = ["resident", "admin"];

for (const role of ROLES) {
  test(`${role} sees Profile after Home in the general group`, () => {
    const general = navGroupsFor(NAV_GROUPS, role).find((group) => group.id === "general");
    assert.deepEqual(
      general.items.map((item) => [item.label, item.href]),
      [["Home", role === "resident" ? "/homeowner" : "/dashboard"], ["Profile", "/profile"]],
    );
  });

  test(`areaRedirect never moves a ${role} off /profile`, () => {
    assert.equal(areaRedirect(role, "/profile"), null);
  });
}

test("Profile is the active item on /profile", () => {
  const hrefs = navGroupsFor(NAV_GROUPS, "admin").flatMap((group) => group.items.map((item) => item.href));
  assert.equal(activeNavHref(PROFILE_HREF, hrefs), "/profile");
  assert.equal(activeNavHref("/dashboard", hrefs), "/dashboard");
});

test("Settings is last in the Admin group for an admin", () => {
  const admin = navGroupsFor(NAV_GROUPS, "admin").find((group) => group.id === "admin");
  assert.deepEqual(
    admin.items.map((item) => [item.label, item.href]),
    [["Users", "/dashboard/users"], ["Hazard map", "/dashboard/hazards"], ["Review inbox", "/dashboard/reviews"], ["Assessment requests", "/dashboard/assessment-requests"], ["Settings", "/dashboard/settings"]],
  );
});

test("Settings does not show for a resident", () => {
  const labels = navGroupsFor(NAV_GROUPS, "resident").flatMap((group) => group.items.map((item) => item.label));
  assert.equal(labels.includes("Settings"), false);
});
