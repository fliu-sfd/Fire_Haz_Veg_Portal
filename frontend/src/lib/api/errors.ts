import { ApiError } from "@/lib/api/client";

export class ResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseFormatError";
  }
}

/** Only network failures and server errors can succeed on a retry. */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return !(error instanceof ResponseFormatError);
}
