import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StateGlyph } from "@/features/hazards/components/state-glyph";
import type { HazardState } from "@/features/hazards/types";
import { ATTENTION_HELP } from "@/features/hazards/utils/display";
import type { SummaryTile } from "@/features/hazards/utils/summary";
import { cn } from "@/lib/utils";

type HazardSummaryStripProps = {
  /** Null until the first response; later loads keep the previous numbers. */
  tiles: SummaryTile[] | null;
  onStateClick: (state: HazardState) => void;
  onAttentionClick: () => void;
};

const tileClass =
  "flex min-h-16 flex-col justify-center rounded-lg border border-city-light bg-white px-3 py-2 text-left shadow-[0_4px_12px_rgba(26,35,40,0.05)]";
const buttonClass =
  "transition-colors hover:border-denim/50 hover:bg-accent motion-reduce:transition-none aria-pressed:border-denim aria-pressed:bg-accent aria-pressed:shadow-[inset_0_0_0_1px_var(--color-denim)]";

function Count({ value, muted }: { value: number; muted: boolean }) {
  return (
    <span className={cn("text-2xl font-semibold tabular-nums", muted ? "text-muted-foreground" : "text-charcoal")}>
      {value.toLocaleString("en-US")}
    </span>
  );
}

function Label({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-city-dark">
      {icon}
      {text}
    </span>
  );
}

export function HazardSummaryStrip({ tiles, onStateClick, onAttentionClick }: HazardSummaryStripProps) {
  return (
    <ul aria-label="Hazard counts" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles === null
        ? Array.from({ length: 5 }, (_, index) => (
            <li key={index} className={cn(index === 0 && "col-span-2 sm:col-span-1")}>
              <div className={tileClass} aria-hidden="true">
                <Skeleton className="h-7 w-10 bg-city-light motion-reduce:animate-none" />
                <Skeleton className="mt-1.5 h-3 w-20 bg-city-light motion-reduce:animate-none" />
              </div>
            </li>
          ))
        : tiles.map((tile) => (
            <li key={tile.kind === "state" ? tile.state : tile.kind} className={cn(tile.kind === "total" && "col-span-2 sm:col-span-1")}>
              {tile.kind === "total" ? (
                <div className={tileClass}>
                  <Count value={tile.count} muted={false} />
                  <Label text={tile.label} />
                </div>
              ) : tile.kind === "state" ? (
                <button
                  type="button"
                  aria-pressed={tile.pressed}
                  aria-label={`${tile.label}: ${tile.count}. Show only ${tile.label.toLowerCase()} hazards`}
                  onClick={() => onStateClick(tile.state)}
                  className={cn(tileClass, buttonClass, "w-full")}
                >
                  <Count value={tile.count} muted={tile.count === 0} />
                  <Label icon={<StateGlyph state={tile.state} className="size-3.5" />} text={tile.label} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-pressed={tile.pressed}
                  aria-label={`${tile.label}: ${tile.count}. ${ATTENTION_HELP}`}
                  title={ATTENTION_HELP}
                  onClick={onAttentionClick}
                  className={cn(tileClass, buttonClass, "w-full")}
                >
                  <Count value={tile.count} muted={tile.count === 0} />
                  <Label icon={<AlertTriangle aria-hidden="true" className="size-3.5 text-fire-red" />} text={tile.label} />
                </button>
              )}
            </li>
          ))}
    </ul>
  );
}
