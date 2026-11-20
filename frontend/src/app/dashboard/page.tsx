import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ClipboardList, MapIcon, Settings, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Department portal",
  description: "Manage vegetation assessments, homeowner updates, and portal accounts.",
};

const sections = [
  { href: "/dashboard/users", label: "Users", description: "Search and review portal accounts.", icon: Users },
  { href: "/dashboard/hazards", label: "Hazard map", description: "See open and closed vegetation hazards on a map.", icon: MapIcon },
  { href: "/dashboard/reviews", label: "Review inbox", description: "Homeowner completion submissions awaiting department review.", icon: Bell },
  { href: "/dashboard/assessment-requests", label: "Assessment requests", description: "Full property assessment requests from homeowners.", icon: ClipboardList },
  { href: "/dashboard/settings", label: "Settings", description: "Edit the wording of messages the portal shows to people.", icon: Settings },
];

// Only signed-in admins reach this page: AuthenticatedShell redirects everyone else.
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Department portal</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">Admin home</h1>
        <p className="mt-3 max-w-2xl leading-7 text-city-dark">
          Manage vegetation assessments, review homeowner updates, and continue active cases.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full gap-4 rounded-lg border border-city-light bg-white p-6 transition-colors hover:border-denim"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded bg-blue-50 text-civic-blue">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-semibold text-charcoal">{label}</span>
                <span className="mt-1 block text-sm leading-6 text-city-dark">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
