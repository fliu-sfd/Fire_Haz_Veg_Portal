"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  authErrorMessage,
  getCurrentAccount,
  signOut,
  type Account,
} from "@/features/auth/api";

type AuthenticatedShellProps = {
  children: ReactNode;
};

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<Account>();
  const [error, setError] = useState<string>();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentAccount()
      .then((current) => {
        if (!active) return;
        if (current.role === "resident" && pathname.startsWith("/dashboard")) {
          router.replace("/homeowner");
          return;
        }
        if (current.role !== "resident" && pathname.startsWith("/homeowner")) {
          router.replace("/dashboard");
          return;
        }
        setAccount(current);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(authErrorMessage(reason));
        router.replace("/sign-in");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (reason) {
      setError(authErrorMessage(reason));
      setIsSigningOut(false);
    }
  }

  if (!account) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-city-gray px-6">
        <p role="status" className="text-city-dark">
          {error ?? "Loading your account…"}
        </p>
      </main>
    );
  }

  const homeHref = account.role === "resident" ? "/homeowner" : "/dashboard";
  const initials = account.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-city-gray md:flex">
      <aside className="flex border-b border-city-light bg-deep-blue text-white md:fixed md:inset-y-0 md:w-64 md:flex-col md:border-b-0 md:border-r md:border-white/10">
        <div className="flex min-w-0 flex-1 items-center gap-5 px-4 py-3 md:flex-col md:items-stretch md:px-5 md:py-6">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="h-9 w-1 shrink-0 bg-city-orange" />
            <span className="min-w-0">
              <span className="block truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-blue-200">
                Fire Prevention
              </span>
              <span className="block truncate text-sm font-semibold md:text-base">
                Vegetation Assessment
              </span>
            </span>
          </Link>

          <nav aria-label="Portal navigation" className="ml-auto md:ml-0 md:mt-10">
            <Link
              href={homeHref}
              aria-current={pathname === homeHref ? "page" : undefined}
              className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-colors ${
                pathname === homeHref
                  ? "bg-white text-deep-blue"
                  : "text-blue-50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </Link>
          </nav>
        </div>

        <div className="hidden border-t border-white/15 p-4 md:block">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-denim text-sm font-bold text-white ring-2 ring-white/25">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{account.fullName}</p>
              <p className="truncate text-xs text-blue-200">{account.email}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            className="mt-4 w-full rounded border border-white/25 px-3 py-2 text-left text-sm font-semibold text-blue-50 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
          {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <div className="flex items-center justify-between border-b border-city-light bg-white px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-denim text-xs font-bold text-white">
              {initials}
            </div>
            <span className="truncate text-sm font-semibold text-charcoal">{account.fullName}</span>
          </div>
          <button type="button" disabled={isSigningOut} onClick={handleSignOut} className="rounded px-3 py-2 text-sm font-semibold text-civic-blue hover:bg-city-gray">
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
