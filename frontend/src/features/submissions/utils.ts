import { authErrorMessage } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 5;
export const MAX_COMMENT_LENGTH = 2000;

export function validatePhotos(files: Pick<File, "type" | "size">[]): string | undefined {
  if (files.length < 1 || files.length > MAX_PHOTOS) return "Choose between one and five photos.";
  if (files.some((file) => !["image/jpeg", "image/png"].includes(file.type))) return "Only JPEG and PNG photos are accepted.";
  if (files.some((file) => file.size === 0)) return "Photos must not be empty.";
  if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return "Each photo must be 5 MB or smaller.";
}

export function submissionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Sign in again to continue.";
    if (error.status >= 500) return "The server could not complete the request. Try again in a moment.";
    return authErrorMessage(error);
  }
  if (error instanceof ResponseFormatError) return "We could not read the response. Reload this property to check whether your submission was saved.";
  return "We could not reach the server. Reload this property to check your submissions before trying again.";
}

export function evidenceDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Phoenix",
  }).format(new Date(value));
}
