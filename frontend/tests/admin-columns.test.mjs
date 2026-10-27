import assert from "node:assert/strict";
import { test } from "node:test";
import {
  USER_COLUMNS,
  USER_COLUMNS_STORAGE_KEY,
  allColumns,
  canHideColumn,
  defaultVisibleColumns,
  hiddenSortLabel,
  parseStoredColumns,
  toggleColumn,
} from "@/features/admin/utils/columns";

const ALL = ["name", "email", "role", "status", "assetIds", "lastLoginAt", "createdAt"];

test("every column is visible by default", () => {
  assert.deepEqual(defaultVisibleColumns(USER_COLUMNS), ALL);
});

test("toggling hides and shows a column in config order", () => {
  const hidden = toggleColumn(USER_COLUMNS, ALL, "role");
  assert.deepEqual(hidden, ["name", "email", "status", "assetIds", "lastLoginAt", "createdAt"]);
  assert.deepEqual(toggleColumn(USER_COLUMNS, hidden, "role"), ALL);
});

test("the locked Name column cannot be hidden", () => {
  assert.equal(canHideColumn(USER_COLUMNS, ALL, "name"), false);
  assert.deepEqual(toggleColumn(USER_COLUMNS, ALL, "name"), ALL);
});

test("the last visible column cannot be hidden", () => {
  const columns = [
    { id: "a", label: "A", defaultVisible: true },
    { id: "b", label: "B", defaultVisible: true },
  ];
  assert.deepEqual(toggleColumn(columns, ["a"], "a"), ["a"]);
  assert.equal(canHideColumn(columns, ["a"], "a"), false);
  assert.equal(canHideColumn(columns, ["a", "b"], "a"), true);
});

test("toggling an unknown id changes nothing", () => {
  assert.deepEqual(toggleColumn(USER_COLUMNS, ["name", "email"], "password"), ["name", "email"]);
});

test("show all restores every column", () => {
  assert.deepEqual(allColumns(USER_COLUMNS), ALL);
});

test("stored ids are kept in config order with unknown ids dropped", () => {
  assert.deepEqual(parseStoredColumns(USER_COLUMNS, '["createdAt","phone","email"]'), ["name", "email", "createdAt"]);
});

test("stored values always include locked columns", () => {
  assert.deepEqual(parseStoredColumns(USER_COLUMNS, '["role"]'), ["name", "role"]);
});

test("unusable stored values fall back to the default", () => {
  for (const raw of ["{not json", "", "null", "42", '"email"', '{"email":true}', "[]", '["phone"]', '[1,2]', '["email",3]']) {
    assert.equal(parseStoredColumns(USER_COLUMNS, raw), undefined, raw);
  }
});

test("names the sort column only when it is hidden", () => {
  assert.equal(hiddenSortLabel(USER_COLUMNS, ALL, "email"), null);
  assert.equal(hiddenSortLabel(USER_COLUMNS, ["name", "role"], "email"), "Email");
  assert.equal(hiddenSortLabel(USER_COLUMNS, ["name"], "created_at"), "Created");
});

test("the storage key changed when Status and Last sign-in were added", () => {
  assert.equal(USER_COLUMNS_STORAGE_KEY, "admin.users.columns.v2");
});
