import type {
  AdminUser,
  AdminUserDetail,
  AdminUserList,
  FirefighterDetails,
  UserUpdateInput,
  UsersQuery,
} from "@/features/admin/types";
import { isUserRole, usersQueryToApiParams } from "@/features/admin/utils/query-params";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isRecord } from "@/lib/api/guards";

const INVALID_LIST = "The user service returned an invalid user list.";
const INVALID_USER = "The user service returned an invalid user.";

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isOptionalDate(value: unknown): value is string | null {
  return value === null || isDate(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseAdminUser(data: unknown): AdminUser {
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.full_name !== "string" ||
    typeof data.email !== "string" ||
    !isUserRole(data.role) ||
    !isStringList(data.asset_ids) ||
    !isDate(data.created_at) ||
    typeof data.is_active !== "boolean" ||
    !isOptionalDate(data.last_login_at)
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
    isActive: data.is_active,
    lastLoginAt: data.last_login_at,
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

function parseFirefighter(data: unknown): FirefighterDetails | null {
  if (data === null) return null;
  if (
    !isRecord(data) ||
    typeof data.employee_id !== "string" ||
    (data.station_code !== null && typeof data.station_code !== "string")
  ) {
    throw new ResponseFormatError(INVALID_USER);
  }
  return { employeeId: data.employee_id, stationCode: data.station_code };
}

export function parseAdminUserDetail(data: unknown): AdminUserDetail {
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.full_name !== "string" ||
    typeof data.email !== "string" ||
    (data.phone !== null && typeof data.phone !== "string") ||
    !isUserRole(data.role) ||
    typeof data.is_active !== "boolean" ||
    typeof data.email_verified !== "boolean" ||
    !isDate(data.created_at) ||
    !isOptionalDate(data.last_login_at) ||
    !isStringList(data.asset_ids) ||
    !("firefighter" in data)
  ) {
    throw new ResponseFormatError(INVALID_USER);
  }
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    isActive: data.is_active,
    emailVerified: data.email_verified,
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at,
    assetIds: data.asset_ids,
    firefighter: parseFirefighter(data.firefighter),
  };
}

function userPath(id: string): string {
  return `/admin/users/${encodeURIComponent(id)}`;
}

/** The PATCH body in the API's field names. Keys left out of `patch` stay out. */
export function updateBody(patch: UserUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.fullName !== undefined) body.full_name = patch.fullName;
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.phone !== undefined) body.phone = patch.phone;
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.isActive !== undefined) body.is_active = patch.isActive;
  if (patch.firefighter !== undefined) {
    body.firefighter = {
      employee_id: patch.firefighter.employeeId,
      station_code: patch.firefighter.stationCode,
    };
  }
  return body;
}

export async function getUser(id: string): Promise<AdminUserDetail> {
  return parseAdminUserDetail(await apiRequest<unknown>(userPath(id)));
}

export async function updateUser(id: string, patch: UserUpdateInput): Promise<AdminUserDetail> {
  const data = await apiRequest<unknown>(userPath(id), {
    method: "PATCH",
    body: JSON.stringify(updateBody(patch)),
  });
  return parseAdminUserDetail(data);
}

export async function linkAsset(id: string, assetId: string): Promise<AdminUserDetail> {
  const data = await apiRequest<unknown>(`${userPath(id)}/assets`, {
    method: "POST",
    body: JSON.stringify({ asset_id: assetId }),
  });
  return parseAdminUserDetail(data);
}

export async function unlinkAsset(id: string, assetId: string): Promise<AdminUserDetail> {
  const data = await apiRequest<unknown>(`${userPath(id)}/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
  return parseAdminUserDetail(data);
}
