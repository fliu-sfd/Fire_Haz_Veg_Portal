import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

const SESSION_ENDED = "Your session has ended. Sign in again to continue.";
const NO_ACCESS = "Your account no longer has administrator access.";
const UNREACHABLE = "We could not reach the server. Check your connection and try again.";

/** A failed save or reset, in plain words, for the alert at the top of that card. */
export function messageActionError(error: unknown): string {
  if (error instanceof ResponseFormatError) {
    return "The server sent a response we could not read. Reload the page and check your change.";
  }
  if (!(error instanceof ApiError)) return UNREACHABLE;
  if (error.status === 401) return SESSION_ENDED;
  if (error.status === 403) return NO_ACCESS;
  if (error.status === 404) return "This message no longer exists. Reload the page to see the current list.";
  if (error.status >= 500) return "The server could not save the change. Try again in a moment.";
  // A 422 carries the rule that failed, such as "Message must be at least 10 characters".
  return authErrorMessage(error);
}

export function messagesLoadError(error: unknown): string {
  if (error instanceof ResponseFormatError) {
    return "The server sent a response we could not read. Try again in a moment.";
  }
  if (!(error instanceof ApiError)) return UNREACHABLE;
  if (error.status === 401) return SESSION_ENDED;
  if (error.status === 403) return NO_ACCESS;
  if (error.status >= 500) return "The server could not load the settings right now. Try again in a moment.";
  return authErrorMessage(error);
}
