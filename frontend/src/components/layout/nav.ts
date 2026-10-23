import type { UserRole } from "@/features/auth/api";

export type NavItem<Icon> = {
  label: string;
  /** A function when the target depends on the role, like Home. */
  href: string | ((role: UserRole) => string);
  icon: Icon;
};

export type NavGroup<Icon> = {
  id: string;
  label?: string;
  requiredRole?: UserRole;
  items: NavItem<Icon>[];
};

export type ResolvedNavItem<Icon> = Omit<NavItem<Icon>, "href"> & { href: string };

export type ResolvedNavGroup<Icon> = Omit<NavGroup<Icon>, "items"> & { items: ResolvedNavItem<Icon>[] };

/** Hiding links is UX only; the API rejects users without the role. */
export function navGroupsFor<Icon>(groups: NavGroup<Icon>[], role: UserRole): ResolvedNavGroup<Icon>[] {
  return groups
    .filter((group) => !group.requiredRole || group.requiredRole === role)
    .map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        href: typeof item.href === "function" ? item.href(role) : item.href,
      })),
    }))
    .filter((group) => group.items.length > 0);
}

/** The longest href that is the current path or one of its parents. */
export function activeNavHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
