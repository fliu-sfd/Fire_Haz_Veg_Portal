import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackendStatus } from "@/features/system/components/backend-status";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Team 4 · Capstone</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vegetation assessment portal</h1>
        <p className="max-w-2xl text-slate-600">A shared foundation for documenting vegetation hazards, helping homeowners take action, and reviewing corrective work.</p>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Homeowner portal">
          <p className="mb-4 text-slate-600">Start building hazard details, cleanup guidance, and photo submissions here.</p>
          <Link className="font-semibold text-green-800 underline underline-offset-4" href="/homeowner">Open homeowner starter →</Link>
        </Card>
        <Card title="Staff dashboard">
          <p className="mb-4 text-slate-600">Start building assessments, submission reviews, and property history here.</p>
          <Link className="font-semibold text-green-800 underline underline-offset-4" href="/dashboard">Open dashboard starter →</Link>
        </Card>
      </div>
      <BackendStatus />
    </div>
  );
}
