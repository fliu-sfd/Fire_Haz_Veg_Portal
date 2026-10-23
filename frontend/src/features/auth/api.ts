import { ApiError, apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isRecord } from "@/lib/api/guards";

export type UserRole = "resident" | "firefighter" | "admin";

export type Account = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  propertyIds: string[];
};

export type HomeownerSignup = {
  full_name: string;
  email: string;
  property_address?: string;
  asset_id: string;
  password: string;
};

export type PropertySummary = {
  assetId: string;
  seasonYear: number | null;
  latestStatus: "ISSUES" | "NO ISSUES" | null;
  latestInspectedAt: string | null;
  siteAddress: string | null;
};

export type Login = {
  email: string;
  password: string;
  remember_me: boolean;
};

function parseAccount(data: unknown): Account {
  if (typeof data !== "object" || data === null) {
    throw new Error("The authentication service returned an invalid account.");
  }
  const value = data as Record<string, unknown>;
  const roles: UserRole[] = ["resident", "firefighter", "admin"];
  if (
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    typeof value.full_name !== "string" ||
    typeof value.role !== "string" ||
    !roles.includes(value.role as UserRole) ||
    !Array.isArray(value.property_ids) ||
    !value.property_ids.every((id) => typeof id === "string")
  ) {
    throw new Error("The authentication service returned an invalid account.");
  }
  return {
    id: value.id,
    email: value.email,
    fullName: value.full_name,
    role: value.role as UserRole,
    propertyIds: value.property_ids,
  };
}

export async function registerHomeowner(payload: HomeownerSignup): Promise<Account> {
  const { property_address, ...requiredFields } = payload;
  const address = property_address?.trim();
  return parseAccount(await apiRequest<unknown>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ ...requiredFields, ...(address ? { property_address: address } : {}) }),
  }));
}

export async function signIn(payload: Login): Promise<Account> {
  return parseAccount(await apiRequest<unknown>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function getCurrentAccount(): Promise<Account> {
  return parseAccount(await apiRequest<unknown>("/auth/me"));
}

export async function getMyProperties(): Promise<PropertySummary[]> {
  const data = await apiRequest<unknown>("/residents/me/properties");
  const invalidResponse = () => new ResponseFormatError("The service returned an invalid property list.");
  if (!Array.isArray(data)) throw invalidResponse();

  return data.map((value: unknown) => {
    if (
      !isRecord(value) ||
      typeof value.asset_id !== "string" || !value.asset_id.trim() ||
      !(value.season_year === null || (typeof value.season_year === "number" && Number.isInteger(value.season_year))) ||
      !(value.latest_status === null || value.latest_status === "ISSUES" || value.latest_status === "NO ISSUES") ||
      !(value.latest_inspected_at === null || (typeof value.latest_inspected_at === "string" && Number.isFinite(Date.parse(value.latest_inspected_at)))) ||
      !(value.site_address === null || typeof value.site_address === "string")
    ) throw invalidResponse();

    return {
      assetId: value.asset_id,
      seasonYear: value.season_year,
      latestStatus: value.latest_status,
      latestInspectedAt: value.latest_inspected_at,
      siteAddress: value.site_address,
    };
  });
}

export function signOut(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "We could not reach the service. Check your connection and try again.";
  }
  const payload = error.detail;
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const message = (detail[0] as { msg?: unknown }).msg;
      if (typeof message === "string") return message.replace(/^Value error, /, "");
    }
  }
  return "The request could not be completed. Review the information and try again.";
}
