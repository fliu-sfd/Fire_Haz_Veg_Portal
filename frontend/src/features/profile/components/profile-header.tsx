import { AccountAvatar } from "@/components/layout/sidebar-nav";
import { RoleBadge } from "@/features/admin/components/role-badge";
import type { UserRole } from "@/features/auth/api";

type ProfileHeaderProps = {
  fullName: string;
  role: UserRole;
  joined: string;
};

export function ProfileHeader({ fullName, role, joined }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col gap-5 rounded-lg border border-city-light border-l-4 border-l-denim bg-white p-6 shadow-[0_12px_32px_rgba(26,35,40,0.08)] sm:flex-row sm:items-center sm:p-7">
      <AccountAvatar fullName={fullName} className="size-20 text-2xl ring-4 ring-accent" />
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Your profile</p>
        <h1 className="mt-1 break-words text-3xl font-light tracking-tight text-charcoal sm:text-4xl">{fullName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-city-dark">
          <RoleBadge role={role} />
          <span>{joined}</span>
        </div>
      </div>
    </header>
  );
}
