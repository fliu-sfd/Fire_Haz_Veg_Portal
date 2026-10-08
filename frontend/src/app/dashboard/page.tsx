import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Department portal",
  description: "Secure access for authorized fire-prevention personnel.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.1)]">
      <div className="border-l-4 border-denim p-7 sm:p-12">
        <div className="flex size-14 items-center justify-center rounded bg-blue-50 text-civic-blue">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 21v-9l8-5 8 5v9M9 21v-5h6v5M8 8V4h8v4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Department portal</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-charcoal sm:text-5xl">Authorized personnel access</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-city-dark">
          Sign in with your department account to manage vegetation assessments, review homeowner updates, and continue active cases.
        </p>
        <Link href="/sign-in" className="mt-8 inline-flex rounded bg-denim px-5 py-3 font-bold text-white transition-colors hover:bg-deep-blue">Staff sign in</Link>
        <div className="mt-10 border-t border-city-light pt-6 text-sm leading-6 text-city-dark">
          Need department access? Contact your administrator for an invitation or registration code.
        </div>
      </div>
    </div>
  );
}
