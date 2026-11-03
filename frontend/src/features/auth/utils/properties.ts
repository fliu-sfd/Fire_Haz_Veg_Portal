import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isRecord } from "@/lib/api/guards";

/** With field set, the message goes under the Asset ID input. Otherwise it is a top alert. */
export type PropertyError = { field?: "assetId"; message: string };

const CODE_ERRORS: Record<string, PropertyError> = {
  property_not_found: {
    field: "assetId",
    message: "We could not find that Asset ID. Check the number on your door tag.",
  },
  already_linked: { field: "assetId", message: "This property is already on your account." },
  too_many_properties: {
    message: "You can link up to 25 properties. Contact the Scottsdale Fire Department if you need more.",
  },
  link_not_allowed: {
    field: "assetId",
    message: "This property cannot be added to your account. Contact the Scottsdale Fire Department.",
  },
};

function errorCode(detail: unknown): string {
  if (!isRecord(detail) || !isRecord(detail.detail)) return "";
  return typeof detail.detail.code === "string" ? detail.detail.code : "";
}

/** Fixed text only: unexpected server text is never shown. */
export function propertyErrorMessage(error: unknown): PropertyError {
  if (error instanceof ResponseFormatError) {
    return { message: "The server sent a response we could not read. Reload the page and check your properties." };
  }
  if (!(error instanceof ApiError)) {
    return { message: "We could not reach the service. Check your connection and try again." };
  }
  const code = errorCode(error.detail);
  if (Object.hasOwn(CODE_ERRORS, code)) return CODE_ERRORS[code];
  if (error.status === 401) return { message: "Your session has ended. Sign in again to continue." };
  if (error.status === 403) return { message: "Only homeowner accounts can change linked properties." };
  if (error.status === 422) {
    return { field: "assetId", message: "Use only letters, numbers, hyphens, and underscores, up to 32 characters." };
  }
  return { message: "We could not save the change. Try again in a moment." };
}
