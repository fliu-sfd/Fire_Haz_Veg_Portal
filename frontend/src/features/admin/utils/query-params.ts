import type { UserRole } from "@/features/auth/api";
import type { SortOrder, UserSortField, UsersQuery } from "@/features/admin/types";

export const USER_ROLES: readonly UserRole[] = ["resident", "firefighter", "admin"];
export const SORT_FIELDS: readonly UserSortField[] = ["full_name", "email", "role", "asset_ids", "created_at"];
export const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"];
// The backend rejects limit above 100 with a 422.
export const PAGE_SIZES: readonly number[] = [10, 25, 50, 100];
export const SEARCH_MAX_LENGTH = 100;

export const DEFAULT_USERS_QUERY: UsersQuery = {
  q: "",
  role: null,
  sort: "created_at",
  order: "desc",
  limit: 25,
  page: 1,
};

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH).trim();
}

export function pageToOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

type ReadableParams = { get(name: string): string | null };

export function parseUsersQuery(params: ReadableParams): UsersQuery {
  const limit = parsePositiveInt(params.get("limit"));
  return {
    q: normalizeSearch(params.get("q") ?? ""),
    role: isUserRole(params.get("role")) ? (params.get("role") as UserRole) : null,
    sort: oneOf(SORT_FIELDS, params.get("sort"), DEFAULT_USERS_QUERY.sort),
    order: oneOf(SORT_ORDERS, params.get("order"), DEFAULT_USERS_QUERY.order),
    limit: limit !== null && PAGE_SIZES.includes(limit) ? limit : DEFAULT_USERS_QUERY.limit,
    page: parsePositiveInt(params.get("page")) ?? DEFAULT_USERS_QUERY.page,
  };
}

/** Page URL state. Defaults are left out so shared links stay short. */
export function usersQueryToSearchParams(query: UsersQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.sort !== DEFAULT_USERS_QUERY.sort) params.set("sort", query.sort);
  if (query.order !== DEFAULT_USERS_QUERY.order) params.set("order", query.order);
  if (query.limit !== DEFAULT_USERS_QUERY.limit) params.set("limit", String(query.limit));
  if (query.page !== DEFAULT_USERS_QUERY.page) params.set("page", String(query.page));
  return params;
}

/** Backend request params. Defaults match the API's own and are left out. */
export function usersQueryToApiParams(query: UsersQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.sort !== "created_at") params.set("sort", query.sort);
  if (query.order !== "desc") params.set("order", query.order);
  if (query.limit !== 25) params.set("limit", String(query.limit));
  const offset = pageToOffset(query.page, query.limit);
  if (offset > 0) params.set("offset", String(offset));
  return params;
}

export function nextSort(
  current: Pick<UsersQuery, "sort" | "order">,
  field: UserSortField,
): Pick<UsersQuery, "sort" | "order"> {
  if (current.sort === field) return { sort: field, order: current.order === "asc" ? "desc" : "asc" };
  // Dates read best newest first; text columns start A to Z.
  return { sort: field, order: field === "created_at" ? "desc" : "asc" };
}

export function hasActiveFilters(query: UsersQuery): boolean {
  return query.q !== "" || query.role !== null;
}
