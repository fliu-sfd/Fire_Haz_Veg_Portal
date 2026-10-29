import { ProfileCard } from "@/features/profile/components/profile-card";
import type { AccountFact } from "@/features/profile/utils/display";

export function AccountInfoCard({ facts }: { facts: AccountFact[] }) {
  return (
    <ProfileCard id="profile-account" title="Account info">
      <dl className="divide-y divide-city-light">
        {facts.map(({ label, value, dateTime }) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <dt className="text-sm text-city-dark">{label}</dt>
            <dd className="text-right text-sm font-semibold text-charcoal">
              {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
            </dd>
          </div>
        ))}
      </dl>
    </ProfileCard>
  );
}
