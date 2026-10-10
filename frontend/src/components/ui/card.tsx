import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-city-light bg-white p-6 shadow-[0_5px_10px_rgba(0,0,0,0.08)]">
      <h2 className="mb-3 text-xl font-medium text-charcoal">{title}</h2>
      {children}
    </section>
  );
}
