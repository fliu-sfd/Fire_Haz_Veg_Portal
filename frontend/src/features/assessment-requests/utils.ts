import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

export const MAX_REQUEST_NOTE_LENGTH = 2000;

export function assessmentRequestDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

export function assessmentRequestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Sign in again to continue.";
    if (error.status === 403) return "You do not have access to assessment requests.";
    if (error.status === 404) return "This property could not be found on your account.";
    if (error.status === 409) return "This request was already handled. Refresh the list and try again.";
    if (error.status >= 500) return "The server could not complete the request. Try again in a moment.";
    return authErrorMessage(error);
  }
  if (error instanceof ResponseFormatError) return error.message;
  return "We could not reach the assessment request service. Check your connection and try again.";
}
