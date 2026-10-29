import { isUserRole } from "@/features/admin/utils/query-params";
import type { FirefighterDetails, PasswordChangeInput, Profile, ProfileUpdateInput } from "@/features/profile/types";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isDate, isOptionalDate, isRecord, isStringList } from "@/lib/api/guards";

const INVALID_PROFILE = "The profile service returned an invalid profile.";

function parseFirefighter(data: unknown): FirefighterDetails | null {
  if (data === null) return null;
  if (
    !isRecord(data) ||
    typeof data.employee_id !== "string" ||
    (data.station_code !== null && typeof data.station_code !== "string")
  ) {
    throw new ResponseFormatError(INVALID_PROFILE);
  }
  return { employeeId: data.employee_id, stationCode: data.station_code };
}

export function parseProfile(data: unknown): Profile {
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.full_name !== "string" ||
    typeof data.email !== "string" ||
    (data.phone !== null && typeof data.phone !== "string") ||
    !isUserRole(data.role) ||
    typeof data.email_verified !== "boolean" ||
    !isDate(data.created_at) ||
    !isOptionalDate(data.last_login_at) ||
    !isStringList(data.asset_ids) ||
    !("firefighter" in data)
  ) {
    throw new ResponseFormatError(INVALID_PROFILE);
  }
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    emailVerified: data.email_verified,
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at,
    assetIds: data.asset_ids,
    firefighter: parseFirefighter(data.firefighter),
  };
}

/** The PATCH body in the API's field names. Keys left out of `patch` stay out. */
export function profileUpdateBody(patch: ProfileUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.fullName !== undefined) body.full_name = patch.fullName;
  if (patch.phone !== undefined) body.phone = patch.phone;
  return body;
}

export async function getProfile(): Promise<Profile> {
  return parseProfile(await apiRequest<unknown>("/me/profile"));
}

export async function updateProfile(patch: ProfileUpdateInput): Promise<Profile> {
  const data = await apiRequest<unknown>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(profileUpdateBody(patch)),
  });
  return parseProfile(data);
}

/** Resolves on 204. The response also carries a fresh auth cookie for this browser. */
export async function changePassword(input: PasswordChangeInput): Promise<void> {
  const data = await apiRequest<unknown>("/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password: input.currentPassword, new_password: input.newPassword }),
  });
  if (data !== undefined) throw new ResponseFormatError("The profile service returned an unexpected response.");
}
