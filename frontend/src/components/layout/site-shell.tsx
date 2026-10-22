"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { SWRProvider } from "@/components/providers/swr-provider";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const isAuthenticatedPage =
    pathname.startsWith("/homeowner") || pathname.startsWith("/dashboard");

  if (isAuthenticatedPage) {
    return (
      <SWRProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </SWRProvider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
      <footer className="mt-8 bg-city-dark text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm sm:px-6">
          <span>Vegetation Assessment Portal</span>
          <span className="text-city-light">Scottsdale Fire Prevention</span>
        </div>
      </footer>
    </div>
  );
}
