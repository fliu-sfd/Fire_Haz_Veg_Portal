import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackendStatus } from "@/features/system/components/backend-status";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="border-l-4 border-denim bg-city-light px-6 py-8 sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Team 4 · Capstone</p>
        <h1 className="mt-3 text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">Vegetation assessment portal</h1>
        <p className="mt-4 max-w-2xl text-city-dark">A shared foundation for documenting vegetation hazards, helping homeowners take action, and reviewing corrective work.</p>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Homeowner portal">
          <p className="mb-4 text-city-dark">Start building hazard details, cleanup guidance, and photo submissions here.</p>
          <Link className="font-semibold text-denim underline-offset-4 hover:underline" href="/homeowner">Open homeowner starter →</Link>
        </Card>
        <Card title="Staff dashboard">
          <p className="mb-4 text-city-dark">Start building assessments, submission reviews, and property history here.</p>
          <Link className="font-semibold text-denim underline-offset-4 hover:underline" href="/dashboard">Open dashboard starter →</Link>
        </Card>
      </div>
      <BackendStatus />
    </div>
  );
}
