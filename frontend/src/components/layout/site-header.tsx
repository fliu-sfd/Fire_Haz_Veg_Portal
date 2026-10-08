"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
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
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-5 text-sm">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "border-b-2 border-denim pb-1 font-semibold text-civic-blue" : "pb-1 text-charcoal transition-colors hover:text-denim"}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
