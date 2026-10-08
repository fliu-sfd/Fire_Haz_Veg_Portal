import { apiRequest } from "@/lib/api/client";

export type HealthResponse = { status: string };

// Example contract: FastAPI must implement GET /health with { "status": "ok" }.
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const data = await apiRequest<unknown>("/health", { signal });
  if (typeof data !== "object" || data === null || !("status" in data) || typeof data.status !== "string") {
    throw new Error("Unexpected health response. Expected a status string.");
  }
  return { status: data.status };
}
