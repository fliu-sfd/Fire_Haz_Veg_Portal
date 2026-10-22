"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import { StateGlyph } from "@/features/hazards/components/state-glyph";
import { stateLabel } from "@/features/hazards/utils/display";
import { HAZARD_STATES } from "@/features/hazards/utils/query-params";
import { cn } from "@/lib/utils";

/** Collapsible on phones to keep the map clear; always open from the sm breakpoint up. */
export function HazardLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  return (
    <div className="rounded-lg border border-city-light bg-white/95 text-sm shadow-md backdrop-blur-sm">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-10 w-full items-center justify-between gap-2 px-3 font-semibold text-charcoal sm:hidden"
      >
        Legend
        {isOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
      </button>
      <div id={listId} className={cn("px-3 pb-2.5 sm:block sm:pt-2.5", !isOpen && "hidden")}>
        <p className="hidden text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase sm:block">Status</p>
        <ul className="mt-1 space-y-1">
          {HAZARD_STATES.map((state) => (
            <li key={state} className="flex items-center gap-2 text-city-dark">
              <StateGlyph state={state} className="size-5 ring-2 ring-white" />
              {stateLabel(state)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
