"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useId } from "react";
import { activeNavHref, type ResolvedNavGroup } from "@/components/layout/nav";
import { Separator } from "@/components/ui/separator";
import type { Account } from "@/features/auth/api";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

type SidebarNavProps = {
  groups: ResolvedNavGroup<LucideIcon>[];
  pathname: string;
  onNavigate?: () => void;
};

export function SidebarNav({ groups, pathname, onNavigate }: SidebarNavProps) {
  const idPrefix = useId();
  const activeHref = activeNavHref(
    pathname,
    groups.flatMap((group) => group.items.map((item) => item.href)),
  );

  return (
    <nav aria-label="Portal navigation">
      {groups.map((group, index) => {
        const labelId = `${idPrefix}-${group.id}`;
        return (
          <Fragment key={group.id}>
            {index > 0 ? <Separator className="my-4 bg-white/15" /> : null}
            <div role={group.label ? "group" : undefined} aria-labelledby={group.label ? labelId : undefined}>
              {group.label ? (
                <p id={labelId} className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-blue-200">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const isActive = href === activeHref;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-colors",
                          isActive ? "bg-white text-deep-blue" : "text-blue-50 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Fragment>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({ href, onNavigate }: { href: string; onNavigate?: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="h-9 w-1 shrink-0 bg-city-orange" />
      <span className="min-w-0">
        <span className="block truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-blue-200">
          Fire Prevention
        </span>
        <span className="block truncate text-sm font-semibold md:text-base">Vegetation Assessment</span>
      </span>
    </Link>
  );
}

export function AccountAvatar({ fullName, className }: { fullName: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-denim text-sm font-bold text-white ring-2 ring-white/25",
        className,
      )}
    >
      {initials(fullName)}
    </div>
  );
}

type SidebarAccountProps = {
  account: Account;
  profileHref: string;
  isProfileActive: boolean;
  isSigningOut: boolean;
  error?: string;
  onSignOut: () => void;
  onNavigate?: () => void;
};

export function SidebarAccount({
  account,
  profileHref,
  isProfileActive,
  isSigningOut,
  error,
  onSignOut,
  onNavigate,
}: SidebarAccountProps) {
  return (
    <div className="border-t border-white/15 p-4">
      <Link
        href={profileHref}
        onClick={onNavigate}
        aria-current={isProfileActive ? "page" : undefined}
        className={cn(
          "-m-2 flex items-center gap-3 rounded p-2 transition-colors",
          isProfileActive ? "bg-white/15" : "hover:bg-white/10",
        )}
      >
        <AccountAvatar fullName={account.fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{account.fullName}</span>
          <span className="block truncate text-xs text-blue-200">{account.email}</span>
          <span className="sr-only">, view your profile</span>
        </span>
      </Link>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={onSignOut}
        className="mt-4 w-full rounded border border-white/25 px-3 py-2 text-left text-sm font-semibold text-blue-50 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
