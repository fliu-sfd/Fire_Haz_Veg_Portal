import assert from "node:assert/strict";
import { test } from "node:test";
import {
  containsPersonalInfo,
  passwordRuleResults,
  validateConfirm,
  validateCurrentPassword,
  validateNewPassword,
} from "@/features/profile/utils/password";

const personal = { email: "carlos.r@example.com", fullName: "Carlos De La Rivera" };
const STRONG = "Ember&Ridge4471";

function met(password, info = personal) {
  return Object.fromEntries(passwordRuleResults(password, info).map((rule) => [rule.id, rule.met]));
}

test("the checklist lists every rule in order", () => {
  assert.deepEqual(
    passwordRuleResults("", personal).map((rule) => rule.id),
    ["length", "upper", "lower", "number", "special", "personal"],
  );
});

test("an empty password meets no rule", () => {
  assert.ok(Object.values(met("")).every((value) => value === false));
});

test("a strong password meets every rule", () => {
  assert.ok(Object.values(met(STRONG)).every((value) => value === true));
});

test("each rule turns on and off by itself", () => {
  assert.equal(met("Ab1!xxxxxxx").length, false);
  assert.equal(met("Ab1!xxxxxxxx").length, true);
  assert.equal(met("ember&ridge4471").upper, false);
  assert.equal(met("EMBER&RIDGE4471").lower, false);
  assert.equal(met("Ember&RidgeABCD").number, false);
  assert.equal(met("EmberRidge44710").special, false);
  assert.equal(met("Ember Ridge 4471").special, false);
  assert.equal(met("Émber&Ridge4471").upper, true);
});

test("the personal rule catches the name and the email", () => {
  assert.equal(met("Carlos&Ridge4471").personal, false);
  assert.equal(met("xxRIVERA!2026yy").personal, false);
  assert.equal(met("My carlos.r#2026").personal, false);
  // short name parts like "De" and "La" are allowed, as on the server
  assert.equal(met("DeLa&Ridge4471").personal, true);
  assert.equal(met(STRONG).personal, true);
});

test("containsPersonalInfo trims ' . - from name parts", () => {
  assert.equal(containsPersonalInfo("xxoneil!2026", { email: "a@b.co", fullName: "Mary O'Neil-" }), false);
  assert.equal(containsPersonalInfo("Xx-ONEIL-!2026", { email: "a@b.co", fullName: "-ONeil." }), true);
  assert.equal(containsPersonalInfo("Jo&Ridge4471", { email: "jo@b.co", fullName: "Jo Li" }), false);
});

test("validateNewPassword follows the backend's order", () => {
  assert.equal(validateNewPassword("", personal), "Enter a new password.");
  assert.match(validateNewPassword("Ab1!", personal), /at least 12/);
  assert.match(validateNewPassword(`Ab1!${"x".repeat(125)}`, personal), /at most 128/);
  assert.match(validateNewPassword(" Ember&Ridge4471", personal), /start or end/);
  assert.match(validateNewPassword("ember&ridge4471", personal), /upper case/);
  assert.match(validateNewPassword("EMBER&RIDGE4471", personal), /lower case/);
  assert.match(validateNewPassword("Ember&RidgeABCD", personal), /number/);
  assert.match(validateNewPassword("EmberRidge44710", personal), /special/);
  assert.equal(validateNewPassword("Carlos&Ridge4471", personal), "Password must not contain your name or email.");
  assert.equal(validateNewPassword(STRONG, personal), undefined);
});

test("validateNewPassword rejects the current password", () => {
  assert.match(validateNewPassword(STRONG, personal, STRONG), /different from your current one/);
  assert.equal(validateNewPassword(STRONG, personal, "Other#Pass2026"), undefined);
});

test("validateCurrentPassword needs a value and keeps spaces", () => {
  assert.equal(validateCurrentPassword(""), "Enter your current password.");
  assert.equal(validateCurrentPassword("   "), undefined);
  assert.match(validateCurrentPassword("x".repeat(129)), /at most 128/);
});

test("validateConfirm reports a missing or mismatched confirmation", () => {
  assert.equal(validateConfirm(STRONG, ""), "Confirm your new password.");
  assert.equal(validateConfirm(STRONG, "Ember&Ridge447"), "Passwords do not match.");
  assert.equal(validateConfirm(STRONG, STRONG), undefined);
});
