import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isRecord } from "@/lib/api/guards";

/** Where an error is shown: under one of the page's fields, or at the top of its card. */
export type ProfileErrorField = "fullName" | "phone" | "currentPassword" | "newPassword" | "confirmPassword";

export type ProfileError = { field?: ProfileErrorField; message: string };

const SESSION_ENDED = "Your session has ended. Sign in again to continue.";

const CODE_ERRORS: Record<string, ProfileError> = {
  wrong_current_password: { field: "currentPassword", message: "Your current password is not correct." },
  password_unchanged: {
    field: "newPassword",
    message: "Choose a password that is different from your current one.",
  },
  password_personal: { field: "newPassword", message: "Password must not contain your name or email." },
};

// FastAPI validation errors point at body fields by their API names.
const BODY_FIELDS: Record<string, ProfileErrorField> = {
  full_name: "fullName",
  phone: "phone",
  current_password: "currentPassword",
  new_password: "newPassword",
};

function errorCode(detail: unknown): string | undefined {
  if (!isRecord(detail) || !isRecord(detail.detail)) return undefined;
  return typeof detail.detail.code === "string" ? detail.detail.code : undefined;
}

function validationField(detail: unknown): ProfileErrorField | undefined {
  if (!isRecord(detail) || !Array.isArray(detail.detail) || !isRecord(detail.detail[0])) return undefined;
  const loc = detail.detail[0].loc;
  const last = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
  return typeof last === "string" ? BODY_FIELDS[last] : undefined;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Maps a failed save or password change to a field, or to the card's alert. */
export function profileError(error: unknown): ProfileError {
  if (error instanceof ResponseFormatError) {
    return { message: "The server sent a response we could not read. Reload the page and check your change." };
  }
  if (!(error instanceof ApiError)) {
    return { message: "We could not reach the server. Check your connection and try again." };
  }
  const known = CODE_ERRORS[errorCode(error.detail) ?? ""];
  if (known) return known;
  if (error.status === 401) return { message: SESSION_ENDED };
  if (error.status === 422) {
    const field = validationField(error.detail);
    return field ? { field, message: authErrorMessage(error) } : { message: authErrorMessage(error) };
  }
  if (error.status >= 500) return { message: "The server could not save the change. Try again in a moment." };
  return { message: authErrorMessage(error) };
}

export function profileLoadErrorMessage(error: unknown): string {
  if (error instanceof ResponseFormatError) {
    return "The server sent a profile we could not read. Try again in a moment.";
  }
  if (!(error instanceof ApiError)) {
    return "We could not reach the server. Check your connection and try again.";
  }
  if (error.status === 401) return SESSION_ENDED;
  if (error.status >= 500) return "The server could not load your profile right now. Try again in a moment.";
  return authErrorMessage(error);
}
