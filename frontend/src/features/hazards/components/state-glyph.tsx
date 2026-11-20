import type { HazardState } from "@/features/hazards/types";
import { STATE_STYLES, type StateGlyph as Glyph } from "@/features/hazards/utils/display";
import { cn } from "@/lib/utils";

// Stroked on a 16 by 16 grid. Shared by the map markers, so a glyph looks the same everywhere.
export const GLYPH_PATHS: Record<Glyph, string> = {
  alert: "M8 3.75v5M8 12.1v.15",
  clock: "M8 2.75a5.25 5.25 0 1 1 0 10.5a5.25 5.25 0 0 1 0-10.5M8 5.25V8l1.9 1.25",
  check: "M3.75 8.4l2.9 2.85l5.6-6",
};

export function StateGlyph({ state, className }: { state: HazardState; className?: string }) {
  const style = STATE_STYLES[state];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ backgroundColor: `var(--color-${style.color})`, color: `var(--color-${style.glyphColor})` }}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-[70%]">
        <path d={GLYPH_PATHS[style.glyph]} />
      </svg>
    </span>
  );
}

export function StateBadge({ state }: { state: HazardState }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-city-light bg-white py-0.5 pr-2.5 pl-1 text-xs font-semibold text-charcoal">
      <StateGlyph state={state} className="size-4" />
      {STATE_STYLES[state].label}
    </span>
  );
}
