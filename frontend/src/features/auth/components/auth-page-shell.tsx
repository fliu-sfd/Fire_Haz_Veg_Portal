import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  panelTitle?: string;
  panelDescription?: string;
  highlights?: string[];
};

const defaultHighlights = [
  "Review vegetation assessment details",
  "Keep property updates in one secure place",
  "Track work from inspection to resolution",
];

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  panelTitle = "A clearer path to a safer property.",
  panelDescription = "The vegetation assessment portal connects residents and fire-prevention staff around the work that matters.",
  highlights = defaultHighlights,
}: AuthPageShellProps) {
  return (
    <section className="overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.12)]">
      <div className="grid lg:min-h-[660px] lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <aside className="relative isolate overflow-hidden bg-civic-blue px-6 py-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute -right-28 -top-28 -z-10 size-80 rounded-full border-[48px] border-white/5" />
          <div className="absolute -bottom-36 -left-24 -z-10 size-80 rounded-full border-[48px] border-denim/50" />

          <Link href="/" className="inline-flex w-fit items-center gap-3 text-white">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded bg-white text-civic-blue">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3c1 3.7 5.3 5.2 5.3 10.1A5.3 5.3 0 0 1 6.7 13.5c0-2.2 1.1-4.2 3.2-6.2.1 1.6.7 2.8 1.6 3.5 1.1-2.7 1.2-5.4.5-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12.1 12.2c1.8 1.7 2.6 3.2 2.4 4.4-.2 1.4-1.2 2.4-2.5 2.4-1.4 0-2.6-1.1-2.6-2.6 0-1.1.6-2.2 1.7-3.3.1.8.4 1.4 1 1.9.4-.9.4-1.9 0-2.8Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Fire Prevention</span>
              <span className="block font-semibold leading-tight">Vegetation Assessment</span>
            </span>
          </Link>

          <div className="mt-10 max-w-md lg:my-16">
            <h2 className="text-3xl font-light leading-tight sm:text-4xl">{panelTitle}</h2>
            <p className="mt-4 leading-7 text-blue-50">{panelDescription}</p>
            <ul className="mt-8 hidden space-y-4 lg:block">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3 text-sm leading-6 text-blue-50">
                  <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden text-xs leading-5 text-blue-100 lg:block">Supporting Scottsdale&apos;s fire-prevention workflow</p>
        </aside>

        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14 xl:px-20">
          <div className="w-full max-w-lg">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-light leading-tight tracking-tight text-charcoal">{title}</h1>
            <p className="mt-4 leading-7 text-city-dark">{description}</p>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 border-t border-city-light pt-6 text-center text-sm text-city-dark">{footer}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
