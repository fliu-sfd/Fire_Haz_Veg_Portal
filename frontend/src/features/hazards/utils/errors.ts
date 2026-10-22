import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

export { accessProblem } from "@/features/admin/utils/errors";

export function hazardErrorMessage(error: unknown): string {
  if (error instanceof ResponseFormatError) {
    return "The server sent a response we could not read. Try again in a moment.";
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Sign in again to continue.";
    if (error.status === 403) return "Administrator access required.";
    if (error.status === 422) return "These filters were not accepted. Clear the filters and try again.";
    if (error.status >= 500) return "The server could not load hazards right now. Try again in a moment.";
  }
  return authErrorMessage(error);
}
