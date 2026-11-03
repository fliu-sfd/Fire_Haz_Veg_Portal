import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/features/auth/api";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<UserRole, { label: string; className: string }> = {
  resident: { label: "Resident", className: "border-denim/25 bg-denim/10 text-civic-blue" },
  admin: { label: "Admin", className: "border-deep-blue bg-deep-blue text-white" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = ROLE_STYLES[role];
  return <Badge className={cn("font-semibold", className)}>{label}</Badge>;
}
