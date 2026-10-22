import type { AdminUser, AdminUserList, UsersQuery } from "@/features/admin/types";
import { isUserRole, usersQueryToApiParams } from "@/features/admin/utils/query-params";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const INVALID_LIST = "The user service returned an invalid user list.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseAdminUser(data: unknown): AdminUser {
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.full_name !== "string" ||
    typeof data.email !== "string" ||
    !isUserRole(data.role) ||
    !Array.isArray(data.asset_ids) ||
    !data.asset_ids.every((id) => typeof id === "string") ||
    typeof data.created_at !== "string" ||
    Number.isNaN(Date.parse(data.created_at))
  ) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    assetIds: data.asset_ids,
    createdAt: data.created_at,
  };
}

export function parseAdminUserList(data: unknown): AdminUserList {
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !isCount(data.total) ||
    !isCount(data.limit) ||
    !isCount(data.offset)
  ) {
    throw new ResponseFormatError(INVALID_LIST);
  }
  return {
    items: data.items.map(parseAdminUser),
    total: data.total,
    limit: data.limit,
    offset: data.offset,
  };
}

export function usersPath(query: UsersQuery): string {
  const search = usersQueryToApiParams(query).toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

export async function listUsers(query: UsersQuery): Promise<AdminUserList> {
  return parseAdminUserList(await apiRequest<unknown>(usersPath(query)));
}
