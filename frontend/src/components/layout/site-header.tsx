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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="font-bold text-green-900">Vegetation Assessment</Link>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-4 text-sm">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "font-semibold text-green-800 underline underline-offset-8" : "text-slate-600 hover:text-green-800"}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
