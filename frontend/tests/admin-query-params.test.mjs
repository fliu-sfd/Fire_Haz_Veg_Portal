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
  usersQueryToSearchParams,
} from "@/features/admin/utils/query-params";

const parse = (search) => parseUsersQuery(new URLSearchParams(search));

test("an empty URL gives the defaults", () => {
  assert.deepEqual(parse(""), DEFAULT_USERS_QUERY);
});

test("reads every valid param", () => {
  assert.deepEqual(parse("q=ada&role=admin&sort=email&order=asc&limit=50&page=3"), {
    q: "ada",
    role: "admin",
    sort: "email",
    order: "asc",
    limit: 50,
    page: 3,
  });
});

test("falls back to defaults for invalid values", () => {
  assert.deepEqual(parse("role=superuser&sort=password&order=up&limit=1000&page=0"), DEFAULT_USERS_QUERY);
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
  const query = { q: "a b", role: "firefighter", sort: "role", order: "asc", limit: 10, page: 4 };
  assert.deepEqual(parseUsersQuery(usersQueryToSearchParams(query)), query);
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
});

test("hasActiveFilters only counts search and role", () => {
  assert.equal(hasActiveFilters(DEFAULT_USERS_QUERY), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, sort: "email", page: 3 }), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, q: "a" }), true);
  assert.equal(hasActiveFilters({ ...DEFAULT_USERS_QUERY, role: "admin" }), true);
});
