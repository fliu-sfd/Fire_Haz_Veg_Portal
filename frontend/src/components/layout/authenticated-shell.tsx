"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useSWRConfig } from "swr";
import { AccountAvatar, SidebarAccount, SidebarBrand, SidebarNav } from "@/components/layout/sidebar-nav";
import { PROFILE_HREF } from "@/components/layout/nav-config";
import { useNavItems } from "@/components/layout/use-nav-items";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authErrorMessage, signOut } from "@/features/auth/api";
import { useCurrentAccount } from "@/features/auth/hooks/use-current-account";
import { areaRedirect, homePathFor } from "@/features/auth/utils/access";

type AuthenticatedShellProps = {
  children: ReactNode;
};

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { account, errorMessage } = useCurrentAccount();
  const navGroups = useNavItems(account);
  const [signOutError, setSignOutError] = useState<string>();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const redirectTo = account ? areaRedirect(account.role, pathname) : null;
  const error = signOutError ?? errorMessage;

  useEffect(() => {
    if (errorMessage) router.replace("/sign-in");
  }, [errorMessage, router]);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(undefined);
    try {
      await signOut();
      // Drop every cached response so the next person on this browser never sees this user's data.
      await mutate(() => true, undefined, { revalidate: false });
      router.replace("/sign-in");
    } catch (reason) {
      setSignOutError(authErrorMessage(reason));
      setIsSigningOut(false);
    }
  }

  if (!account || redirectTo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-city-gray px-6">
        <p role="status" className="text-city-dark">
          {isSigningOut ? "Signing out…" : error ?? "Loading your account…"}
        </p>
      </main>
    );
  }

  const homeHref = homePathFor(account.role);
  const closeDrawer = () => setIsDrawerOpen(false);
  const isProfileActive = pathname === PROFILE_HREF;
  const accountPanel = (onNavigate?: () => void) => (
    <SidebarAccount
      account={account}
      profileHref={PROFILE_HREF}
      isProfileActive={isProfileActive}
      isSigningOut={isSigningOut}
      error={error}
      onSignOut={handleSignOut}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="min-h-screen bg-city-gray md:flex">
      <aside className="hidden bg-deep-blue text-white md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:border-white/10">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
          <SidebarBrand href={homeHref} />
          <div className="mt-10">
            <SidebarNav groups={navGroups} pathname={pathname} />
          </div>
        </div>
        {accountPanel()}
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <div className="flex items-center gap-3 bg-deep-blue px-4 py-3 text-white md:hidden">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger
              aria-label="Open navigation"
              className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded text-blue-50 transition-colors hover:bg-white/10"
            >
              <Menu aria-hidden="true" className="size-6" />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              aria-describedby={undefined}
              className="w-72 max-w-[85vw] gap-0 border-white/10 bg-deep-blue text-white"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex items-start gap-3 px-5 pt-5">
                <div className="min-w-0 flex-1">
                  <SidebarBrand href={homeHref} onNavigate={closeDrawer} />
                </div>
                <SheetClose className="flex size-9 shrink-0 items-center justify-center rounded text-blue-50 transition-colors hover:bg-white/10">
                  <X aria-hidden="true" className="size-5" />
                  <span className="sr-only">Close navigation</span>
                </SheetClose>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8">
                <SidebarNav groups={navGroups} pathname={pathname} onNavigate={closeDrawer} />
              </div>
              {accountPanel(closeDrawer)}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <SidebarBrand href={homeHref} />
          </div>
          <Link
            href={PROFILE_HREF}
            aria-label="Your profile"
            aria-current={isProfileActive ? "page" : undefined}
            className="shrink-0 rounded-full"
          >
            <AccountAvatar
              fullName={account.fullName}
              className={isProfileActive ? "size-9 text-xs ring-2 ring-white" : "size-9 text-xs ring-0"}
            />
          </Link>
        </div>
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          <TooltipProvider>{children}</TooltipProvider>
        </main>
      </div>
    </div>
  );
}
