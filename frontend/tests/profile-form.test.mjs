import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPatch,
  initialProfileValues,
  isDirty,
  validateProfileField,
  validateProfileForm,
} from "@/features/profile/utils/profile-form";
import { validateFullName, validatePhone } from "@/lib/validation/person";

const profile = {
  id: "u1",
  fullName: "Carlos Rivera",
  email: "carlos@example.com",
  phone: "480-555-0100",
  role: "resident",
  emailVerified: false,
  createdAt: "2026-10-07T15:30:00Z",
  lastLoginAt: null,
  assetIds: ["1732983"],
  firefighter: null,
};

const initial = initialProfileValues(profile);

test("initial values use a blank for a missing phone", () => {
  assert.deepEqual(initial, { fullName: "Carlos Rivera", phone: "480-555-0100" });
  assert.deepEqual(initialProfileValues({ ...profile, phone: null }), { fullName: "Carlos Rivera", phone: "" });
});

test("buildPatch sends nothing when nothing changed", () => {
  assert.deepEqual(buildPatch(initial, { ...initial }), {});
  assert.equal(isDirty(initial, { ...initial }), false);
});

test("buildPatch ignores spacing the backend would clean away", () => {
  assert.deepEqual(buildPatch(initial, { fullName: "  Carlos   Rivera ", phone: " 480-555-0100 " }), {});
});

test("buildPatch sends only the changed name, cleaned", () => {
  assert.deepEqual(buildPatch(initial, { ...initial, fullName: " Carla  Rivera" }), { fullName: "Carla Rivera" });
  assert.equal(isDirty(initial, { ...initial, fullName: "Carla Rivera" }), true);
});

test("buildPatch sends only the changed phone", () => {
  assert.deepEqual(buildPatch(initial, { ...initial, phone: "480-555-0111" }), { phone: "480-555-0111" });
});

test("buildPatch sends both when both changed", () => {
  assert.deepEqual(buildPatch(initial, { fullName: "Carla Rivera", phone: "480-555-0111" }), {
    fullName: "Carla Rivera",
    phone: "480-555-0111",
  });
});

test("buildPatch sends phone null when it is cleared", () => {
  assert.deepEqual(buildPatch(initial, { ...initial, phone: "" }), { phone: null });
  assert.deepEqual(buildPatch(initial, { ...initial, phone: "   " }), { phone: null });
});

test("buildPatch sends nothing for a blank phone that was already empty", () => {
  const empty = { fullName: "Carlos Rivera", phone: "" };
  assert.deepEqual(buildPatch(empty, { ...empty, phone: "  " }), {});
});

// Same cases as backend/tests for clean_full_name and clean_phone.
test("name validator matches the backend rules", () => {
  for (const name of ["Mary-Jane O'Neil", "J. R. Smith", "José Núñez", "Al"]) {
    assert.equal(validateFullName(name), undefined, name);
  }
  for (const name of ["", "A", "R2D2", "<script>", "x".repeat(121), "Carlos_Rivera"]) {
    assert.ok(validateFullName(name), name);
  }
});

test("phone validator matches the backend rules", () => {
  for (const phone of ["", "480-555-0100", "(480) 555-0100", "+1 480 555 0100", "4805550100"]) {
    assert.equal(validatePhone(phone), undefined, phone);
  }
  for (const phone of ["12345", "480-555-01OO", "1".repeat(16), "+1 (480) 555-0100 ext 9", "480+555+0100"]) {
    assert.ok(validatePhone(phone), phone);
  }
});

test("validateProfileField checks one field", () => {
  assert.equal(validateProfileField("fullName", { fullName: "", phone: "" }), "Enter a full name.");
  assert.equal(validateProfileField("phone", { fullName: "", phone: "" }), undefined);
  assert.match(validateProfileField("phone", { fullName: "", phone: "123" }), /10 to 15 digits/);
});

test("validateProfileForm returns an error per invalid field", () => {
  assert.deepEqual(validateProfileForm(initial), {});
  assert.deepEqual(Object.keys(validateProfileForm({ fullName: "A", phone: "abc" })), ["fullName", "phone"]);
});
