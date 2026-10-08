"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/homeowner", label: "Homeowner" },
  { href: "/dashboard", label: "Staff" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-city-light border-t-4 border-t-denim bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-charcoal">
          <span aria-hidden="true" className="h-10 w-1 bg-denim" />
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-civic-blue">Fire Prevention</span>
            <span className="block text-lg font-medium leading-tight">Vegetation Assessment</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
          <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm md:flex">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                className={pathname === href ? "border-b-2 border-denim pb-1 font-semibold text-civic-blue" : "pb-1 text-charcoal transition-colors hover:text-denim"}>
                {label}
              </Link>
            ))}
          </nav>
          <span aria-hidden="true" className="hidden h-6 w-px bg-city-light md:block" />
          <Link
            href="/sign-in"
            aria-current={pathname === "/sign-in" ? "page" : undefined}
            className="rounded px-2 py-2 text-sm font-bold text-civic-blue transition-colors hover:bg-city-gray hover:text-denim sm:px-3"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up/homeowner"
            aria-current={pathname === "/sign-up/homeowner" ? "page" : undefined}
            className="rounded bg-denim px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-deep-blue sm:px-4"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
