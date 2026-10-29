import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProfileCardProps = {
  id: string;
  title: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** One titled section of the profile page. The heading names the section for screen readers. */
export function ProfileCard({ id, title, description, className, children }: ProfileCardProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-lg border border-city-light bg-white p-6 shadow-[0_12px_32px_rgba(26,35,40,0.08)] sm:p-7", className)}
    >
      <h2 id={headingId} className="text-xl font-medium text-charcoal">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-city-dark">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
