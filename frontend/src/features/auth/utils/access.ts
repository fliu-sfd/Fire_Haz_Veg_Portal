import type { UserRole } from "@/features/auth/api";

export function homePathFor(role: UserRole): string {
  return role === "resident" ? "/homeowner" : "/dashboard";
}

/** Where a signed-in user must go instead of `pathname`, or null if they may stay. */
export function areaRedirect(role: UserRole, pathname: string): string | null {
  if (role === "resident" && pathname.startsWith("/dashboard")) return "/homeowner";
  if (role !== "resident" && pathname.startsWith("/homeowner")) return "/dashboard";
  return null;
}
