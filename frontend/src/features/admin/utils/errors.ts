import type { UserFormField } from "@/features/admin/utils/user-form";
import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isRecord } from "@/lib/api/guards";

export type AccessProblem = "unauthorized" | "forbidden";

export function accessProblem(error: unknown): AccessProblem | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) return "unauthorized";
  if (error.status === 403) return "forbidden";
  return null;
}

export function adminErrorMessage(error: unknown): string {
  if (error instanceof ResponseFormatError) {
    return "The server sent a response we could not read. Try again in a moment.";
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Sign in again to continue.";
    if (error.status === 403) return "Administrator access required.";
    if (error.status === 422) return "These filters were not accepted. Clear the filters and try again.";
    if (error.status >= 500) return "The server could not load users right now. Try again in a moment.";
  }
  return authErrorMessage(error);
}

/** Where an edit error is shown: under a form field, under the asset input, or at the top. */
export type EditErrorField = UserFormField | "assetId";

export type EditError = { field?: EditErrorField; message: string };

const CODE_ERRORS: Record<string, EditError> = {
  email_taken: { field: "email", message: "Another account already uses this email." },
  employee_id_taken: { field: "employeeId", message: "Another firefighter already has this employee ID." },
  firefighter_details_required: { field: "employeeId", message: "Enter an employee ID to make this user a firefighter." },
  property_not_found: { field: "assetId", message: "No inspection record has this asset ID. Check it and try again." },
  user_not_found: { message: "This user no longer exists. Close the panel and refresh the list." },
  last_admin: { message: "This is the only active admin. Make another user an admin before changing this account." },
  unlink_assets_first: { message: "Remove this user's linked properties before changing their role." },
  cannot_change_own_access: { message: "You can't change your own role or turn off your own account." },
  firefighter_not_applicable: { message: "Firefighter details only apply to firefighter accounts." },
  assets_residents_only: { message: "Only homeowner accounts can have linked properties." },
};

// FastAPI validation errors point at body fields by their API names.
const BODY_FIELDS: Record<string, EditErrorField> = {
  full_name: "fullName",
  email: "email",
  phone: "phone",
  employee_id: "employeeId",
  station_code: "stationCode",
  asset_id: "assetId",
};

function errorCode(detail: unknown): string | undefined {
  if (!isRecord(detail) || !isRecord(detail.detail)) return undefined;
  return typeof detail.detail.code === "string" ? detail.detail.code : undefined;
}

function validationField(detail: unknown): EditErrorField | undefined {
  if (!isRecord(detail) || !Array.isArray(detail.detail) || !isRecord(detail.detail[0])) return undefined;
  const loc = detail.detail[0].loc;
  const last = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
  return typeof last === "string" ? BODY_FIELDS[last] : undefined;
}

export function editError(error: unknown): EditError {
  if (error instanceof ResponseFormatError) {
    return { message: "The server sent a response we could not read. Reload the user and check the change." };
  }
  if (!(error instanceof ApiError)) {
    return { message: "We could not reach the server. Check your connection and try again." };
  }
  const known = CODE_ERRORS[errorCode(error.detail) ?? ""];
  if (known) return known;
  if (error.status === 401) return { message: "Your session has ended. Sign in again to continue." };
  if (error.status === 403) return { message: "Administrator access required." };
  if (error.status === 422) {
    const field = validationField(error.detail);
    return field ? { field, message: authErrorMessage(error) } : { message: authErrorMessage(error) };
  }
  if (error.status >= 500) return { message: "The server could not save the change. Try again in a moment." };
  return { message: authErrorMessage(error) };
}

export function userLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "This user no longer exists. They may have been removed.";
  }
  // A hand-edited link with an id that is not a UUID.
  if (error instanceof ApiError && error.status === 422) {
    return "This link does not point to a valid user.";
  }
  if (error instanceof ApiError && error.status >= 500) {
    return "The server could not load this user. Try again in a moment.";
  }
  return adminErrorMessage(error);
}
