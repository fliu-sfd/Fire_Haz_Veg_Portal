import { ProfileCard } from "@/features/profile/components/profile-card";
import type { FirefighterDetails } from "@/features/profile/types";

export function DepartmentDetailsCard({ details }: { details: FirefighterDetails | null }) {
  const rows = [
    { label: "Employee ID", value: details?.employeeId ?? "Not set" },
    { label: "Station code", value: details?.stationCode ?? "Not set" },
  ];
  return (
    <ProfileCard id="profile-department" title="Department details">
      <dl className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="rounded border border-city-light bg-city-gray p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-charcoal">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-city-dark">Contact an administrator to update these.</p>
    </ProfileCard>
  );
}
