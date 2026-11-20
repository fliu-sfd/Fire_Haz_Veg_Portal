import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPatch,
  initialFormValues,
  isDirty,
  removeAssetConfirmation,
  saveConfirmation,
  validateAssetId,
  validateEmail,
  validateForm,
  validateFullName,
  validatePhone,
} from "@/features/admin/utils/user-form";

const detail = {
  id: "u1",
  fullName: "Carlos Rivera",
  email: "carlos@example.com",
  phone: "480-555-0100",
  role: "resident",
  isActive: true,
  emailVerified: false,
  createdAt: "2026-10-01T15:30:00Z",
  lastLoginAt: null,
  assetIds: ["1732983"],
};

const initial = initialFormValues(detail);

test("initial values fill a blank for a missing phone", () => {
  assert.deepEqual(initialFormValues({ ...detail, phone: null }), { ...initial, phone: "" });
});

// --- buildPatch ---

test("buildPatch sends nothing when nothing changed", () => {
  assert.deepEqual(buildPatch(initial, { ...initial }), {});
  assert.equal(isDirty(initial, { ...initial }), false);
});

test("buildPatch ignores changes the backend would clean away", () => {
  const current = { ...initial, fullName: "  Carlos   Rivera ", email: " CARLOS@example.com", phone: "480-555-0100 " };
  assert.deepEqual(buildPatch(initial, current), {});
});

test("buildPatch sends only changed fields, cleaned", () => {
  const current = { ...initial, fullName: " Carla  Rivera", email: "Carla@Example.com" };
  assert.deepEqual(buildPatch(initial, current), { fullName: "Carla Rivera", email: "carla@example.com" });
  assert.equal(isDirty(initial, current), true);
});

test("buildPatch sends phone null when the phone is cleared", () => {
  assert.deepEqual(buildPatch(initial, { ...initial, phone: "   " }), { phone: null });
});

test("buildPatch sends role and status changes", () => {
  assert.deepEqual(buildPatch(initial, { ...initial, role: "admin", isActive: false }), {
    role: "admin",
    isActive: false,
  });
});

// --- validators (same rules as app/schemas/validators.py) ---

const cases = {
  validateFullName: {
    valid: ["Ann Lee", "Mary-Jane O'Neil", "J. R. Smith", "José Núñez", "  Ann   Lee  "],
    invalid: ["", " ", "A", "R2D2", "Ann_Lee", "x".repeat(121), "-Ann"],
  },
  validateEmail: {
    valid: ["ann@example.com", " Ann@Example.com "],
    invalid: ["", "ann", "ann@", "ann@example", "a b@example.com", `${"a".repeat(250)}@x.com`],
  },
  validatePhone: {
    valid: ["", "  ", "4805550100", "(480) 555-0100", "+1 480 555 0100", "+44 20 7946 0958"],
    invalid: ["555-0100", "480-555-0100 ext 5", "1".repeat(16), "+1 (480) 555-0100 999", "480.555.0100", "1+4805550100"],
  },
  validateAssetId: {
    valid: ["1732983", " naos-77b "],
    invalid: ["", "17 32", "x".repeat(33), "A/1"],
  },
};

const validators = {
  validateFullName,
  validateEmail,
  validatePhone,
  validateAssetId,
};

for (const [name, { valid, invalid }] of Object.entries(cases)) {
  for (const value of valid) {
    test(`${name} accepts ${JSON.stringify(value)}`, () => {
      assert.equal(validators[name](value), undefined);
    });
  }
  for (const value of invalid) {
    test(`${name} rejects ${JSON.stringify(value)}`, () => {
      assert.equal(typeof validators[name](value), "string");
    });
  }
}

test("validateForm reports every invalid field", () => {
  const errors = validateForm({ ...initial, fullName: "", email: "nope", phone: "12" });
  assert.deepEqual(Object.keys(errors).sort(), ["email", "fullName", "phone"]);
});

// --- confirmation ---

test("a plain detail edit needs no confirmation", () => {
  assert.equal(saveConfirmation("Carlos", initial, { fullName: "Carla Rivera", phone: null }), null);
});

test("turning an account on needs no confirmation", () => {
  const disabled = { ...initial, isActive: false };
  assert.equal(saveConfirmation("Carlos", disabled, { isActive: true }), null);
});

test("disabling an account asks first", () => {
  const confirmation = saveConfirmation("Carlos", initial, { isActive: false });
  assert.equal(confirmation.title, "Disable Carlos?");
  assert.match(confirmation.description, /signed out/);
  assert.equal(confirmation.actionLabel, "Disable account");
  assert.equal(confirmation.destructive, true);
});

test("a role change asks first and names both roles", () => {
  const confirmation = saveConfirmation("Carlos", initial, { role: "admin" });
  assert.equal(confirmation.title, "Change Carlos from Resident to Admin?");
  assert.equal(confirmation.description, "Their access changes on their next request.");
  assert.equal(confirmation.actionLabel, "Change role");
});

test("disabling and changing role together mention both", () => {
  const confirmation = saveConfirmation("Carlos", initial, { role: "admin", isActive: false });
  assert.match(confirmation.description, /from Resident to Admin/);
  assert.equal(confirmation.actionLabel, "Disable and change role");
});

test("removing a property names the asset and the user", () => {
  assert.equal(removeAssetConfirmation("Carlos", "1732983").title, "Remove 1732983 from Carlos?");
});

test("no confirmation text uses an em dash", () => {
  const all = [
    saveConfirmation("A", initial, { isActive: false, role: "admin" }),
    saveConfirmation("A", initial, { role: "admin" }),
    removeAssetConfirmation("A", "1"),
  ];
  for (const confirmation of all) assert.doesNotMatch(Object.values(confirmation).join(" "), /\u2014/);
});
