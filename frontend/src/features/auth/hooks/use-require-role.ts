import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserRole } from "@/features/auth/api";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";

export type RoleAccess = "loading" | "allowed" | "denied";

/** UX guard only: the API still enforces access. Denied users are redirected. */
export function useRequireRole(role: UserRole, redirectTo = "/dashboard"): { status: RoleAccess } {
  const router = useRouter();
  const { account } = useCurrentAccount();
  const status: RoleAccess = !account ? "loading" : account.role === role ? "allowed" : "denied";

  useEffect(() => {
    if (status === "denied") router.replace(redirectTo);
  }, [status, redirectTo, router]);

  return { status };
}
