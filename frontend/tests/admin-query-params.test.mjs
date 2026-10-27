import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_USERS_QUERY,
  hasActiveFilters,
  nextSort,
  normalizeSearch,
  pageCount,
  pageToOffset,
  parseUsersQuery,
  readSelectedUser,
  usersQueryToApiParams,
  usersQueryToSearchParams,
  withSelectedUser,
} from "@/features/admin/utils/query-params";

const parse = (search) => parseUsersQuery(new URLSearchParams(search));

test("an empty URL gives the defaults", () => {
  assert.deepEqual(parse(""), DEFAULT_USERS_QUERY);
});

test("reads every valid param", () => {
  assert.deepEqual(parse("q=ada&role=admin&status=disabled&sort=email&order=asc&limit=50&page=3"), {
    q: "ada",
    role: "admin",
    isActive: false,
    sort: "email",
    order: "asc",
    limit: 50,
    page: 3,
  });
});

test("falls back to defaults for invalid values", () => {
  assert.deepEqual(parse("role=superuser&status=false&sort=password&order=up&limit=1000&page=0"), DEFAULT_USERS_QUERY);
  assert.equal(parse("status=toString").isActive, null);
  assert.equal(parse("limit=30").limit, 25);
  assert.equal(parse("page=-2").page, 1);
  assert.equal(parse("page=2.5").page, 1);
  assert.equal(parse("page=abc").page, 1);
  assert.equal(parse("limit=1e2").limit, 25);
});

test("normalizes search from the URL", () => {
  assert.equal(parse("q=%20%20ada%20%20%20lovelace%20").q, "ada lovelace");
  assert.equal(parse("q=%20%20%20").q, "");
  assert.equal(parse(`q=${"x".repeat(150)}`).q.length, 100);
});

test("normalizeSearch trims, collapses whitespace and caps length", () => {
  assert.equal(normalizeSearch("  a\t\n b  "), "a b");
  assert.equal(normalizeSearch("y".repeat(101)), "y".repeat(100));
  assert.equal(normalizeSearch(`${"z".repeat(99)}  q`), "z".repeat(99));
});

test("URL state omits defaults and round-trips", () => {
  assert.equal(usersQueryToSearchParams(DEFAULT_USERS_QUERY).toString(), "");
  const query = { q: "a b", role: "firefighter", isActive: true, sort: "role", order: "asc", limit: 10, page: 4 };
  assert.deepEqual(parseUsersQuery(usersQueryToSearchParams(query)), query);
  assert.equal(usersQueryToSearchParams({ ...query, isActive: false }).get("status"), "disabled");
});

test("pageToOffset converts one-based pages", () => {
  assert.equal(pageToOffset(1, 25), 0);
  assert.equal(pageToOffset(2, 25), 25);
  assert.equal(pageToOffset(4, 10), 30);
});

test("pageCount is at least one", () => {
  assert.equal(pageCount(0, 25), 1);
  assert.equal(pageCount(25, 25), 1);
  assert.equal(pageCount(26, 25), 2);
});

test("nextSort flips order on the same column", () => {
  assert.deepEqual(nextSort({ sort: "email", order: "asc" }, "email"), { sort: "email", order: "desc" });
  assert.deepEqual(nextSort({ sort: "email", order: "desc" }, "email"), { sort: "email", order: "asc" });
});

test("nextSort starts text columns A to Z and dates newest first", () => {
  assert.deepEqual(nextSort({ sort: "created_at", order: "desc" }, "full_name"), { sort: "full_name", order: "asc" });
  assert.deepEqual(nextSort({ sort: "email", order: "asc" }, "created_at"), { sort: "created_at", order: "desc" });
  assert.deepEqual(nextSort({ sort: "email", order: "asc" }, "last_login_at"), { sort: "last_login_at", order: "desc" });
  assert.deepEqual(nextSort({ sort: "email", order: "desc" }, "is_active"), { sort: "is_active", order: "asc" });
});

test("hasActiveFilters counts search, role and status", () => {
  assert.equal(hasActiveFilters(DEFAULT_USERS_QUERY), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, sort: "email", page: 3 }), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, q: "a" }), true);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, role: "admin" }), true);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, isActive: false }), true);
});

test("is_active is sent to the API only when a status is chosen", () => {
  assert.equal(usersQueryToApiParams(DEFAULT_USERS_QUERY).has("is_active"), false);
  assert.equal(usersQueryToApiParams({ ...DEFAULT_USERS_QUERY, isActive: true }).get("is_active"), "true");
  assert.equal(usersQueryToApiParams({ ...DEFAULT_USERS_QUERY, isActive: false }).get("is_active"), "false");
  assert.equal(usersQueryToApiParams({ ...DEFAULT_USERS_QUERY, isActive: false }).has("status"), false);
});

test("the selected user never reaches the list query, its API params or its URL state", () => {
  const params = new URLSearchParams("q=ada&page=2&user=8f9d2a8e-7b1c-4d7e-9a43-0c2f7f1e5b6a");
  const query = parseUsersQuery(params);
  assert.equal("user" in query, false);
  assert.deepEqual(query, parse("q=ada&page=2"));
  assert.equal(usersQueryToApiParams(query).has("user"), false);
  assert.equal(usersQueryToSearchParams(query).has("user"), false);
});

test("readSelectedUser reads the id and treats blank as none", () => {
  assert.equal(readSelectedUser(new URLSearchParams("user=abc")), "abc");
  assert.equal(readSelectedUser(new URLSearchParams("user=%20")), null);
  assert.equal(readSelectedUser(new URLSearchParams("q=a")), null);
});

test("withSelectedUser keeps filters and page", () => {
  const params = new URLSearchParams("q=ada&role=admin&page=3");
  assert.equal(withSelectedUser(params, "u1"), "q=ada&role=admin&page=3&user=u1");
  assert.equal(withSelectedUser(new URLSearchParams("q=ada&user=u1&page=3"), null), "q=ada&page=3");
  assert.equal(params.has("user"), false);
});
