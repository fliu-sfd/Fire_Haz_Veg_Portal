import { House, MapIcon, Users, type LucideIcon } from "lucide-react";
import type { NavGroup } from "@/components/layout/nav";
import { homePathFor } from "@/features/auth/utils/access";

// New sections are added here; the sidebar and drawer render whatever this allows.
export const NAV_GROUPS: NavGroup<LucideIcon>[] = [
  {
    id: "general",
    items: [{ label: "Home", href: homePathFor, icon: House }],
  },
  {
    id: "admin",
    label: "Admin",
    requiredRole: "admin",
    items: [
      { label: "Users", href: "/dashboard/users", icon: Users },
      { label: "Hazard map", href: "/dashboard/hazards", icon: MapIcon },
    ],
  },
];
