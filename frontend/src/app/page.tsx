import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Review your assessment",
    description: "See the vegetation concerns documented for your property and understand why they matter.",
  },
  {
    number: "02",
    title: "Complete the work",
    description: "Follow clear guidance to reduce hazards and create safer defensible space around your home.",
  },
  {
    number: "03",
    title: "Share your progress",
    description: "Upload completion photos and keep your assessment status in one convenient place.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 pb-4">
      <section className="relative isolate overflow-hidden rounded bg-civic-blue px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="absolute -right-32 -top-36 -z-10 size-[28rem] rounded-full border-[64px] border-white/5" />
        <div className="absolute -bottom-48 right-24 -z-10 size-80 rounded-full border-[54px] border-denim/50" />

        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-100">Scottsdale Fire Prevention</p>
          <h1 className="mt-4 text-4xl font-light leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Safer properties start with clear action.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-50">
            Review vegetation assessment findings, understand the work your property needs, and share progress with the fire-prevention team.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/sign-up/homeowner"
              className="rounded bg-white px-5 py-3 font-bold text-civic-blue transition-colors hover:bg-city-light"
            >
              Create homeowner account
            </Link>
            <Link
              href="/sign-in"
              className="rounded border border-white/70 px-5 py-3 font-bold text-white transition-colors hover:bg-white hover:text-civic-blue"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">How it works</p>
          <h2 id="how-it-works" className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
            From assessment to a safer property
          </h2>
        </div>
        <ol className="mt-8 grid gap-px overflow-hidden rounded border border-city-light bg-city-light md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="bg-white p-6 sm:p-8">
              <span className="text-sm font-bold text-denim">{step.number}</span>
              <h3 className="mt-5 text-xl font-semibold text-charcoal">{step.title}</h3>
              <p className="mt-3 leading-7 text-city-dark">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.08)] md:grid-cols-2">
        <div className="p-7 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">For homeowners</p>
          <h2 className="mt-3 text-2xl font-light text-charcoal">Manage your property assessment</h2>
          <p className="mt-3 leading-7 text-city-dark">Create an account using the Property ID included with your assessment notice.</p>
          <Link href="/sign-up/homeowner" className="mt-6 inline-flex font-bold text-denim underline-offset-4 hover:underline">
            Get started →
          </Link>
        </div>
        <div className="border-t border-city-light bg-city-gray p-7 sm:p-10 md:border-l md:border-t-0">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">For fire personnel</p>
          <h2 className="mt-3 text-2xl font-light text-charcoal">Continue department work</h2>
          <p className="mt-3 leading-7 text-city-dark">Authorized staff can sign in to review assessments and property updates.</p>
          <Link href="/sign-in" className="mt-6 inline-flex font-bold text-denim underline-offset-4 hover:underline">
            Staff sign in →
          </Link>
        </div>
      </section>
    </div>
  );
}
