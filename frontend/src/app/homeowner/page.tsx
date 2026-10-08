import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Homeowner portal",
  description: "Access and manage your property vegetation assessment.",
};

const features = [
  "Review vegetation hazards identified during inspection",
  "Follow corrective-work guidance for your property",
  "Share completion photos with the fire-prevention team",
];

export default function HomeownerPage() {
  return (
    <div className="grid overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.1)] lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Homeowner portal</p>
        <h1 className="mt-3 text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">Your property assessment, made clear.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-city-dark">
          Sign in to understand your assessment, document completed work, and keep your property&apos;s progress moving forward.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-in" className="rounded bg-denim px-5 py-3 font-bold text-white transition-colors hover:bg-deep-blue">Sign in</Link>
          <Link href="/sign-up/homeowner" className="rounded border border-civic-blue px-5 py-3 font-bold text-civic-blue transition-colors hover:bg-civic-blue hover:text-white">Create account</Link>
        </div>
        <p className="mt-6 text-sm leading-6 text-city-dark">You will need the Property ID from your assessment notice to register.</p>
      </section>

      <aside className="relative isolate overflow-hidden bg-civic-blue p-7 text-white sm:p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -right-28 -top-28 -z-10 size-72 rounded-full border-[46px] border-white/5" />
        <h2 className="text-2xl font-light">Keep every next step in one place</h2>
        <ul className="mt-8 space-y-6">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-4 leading-7 text-blue-50">
              <span aria-hidden="true" className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
