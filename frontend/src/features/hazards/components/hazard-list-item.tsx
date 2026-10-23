import { Camera, CameraOff, MessageSquareOff } from "lucide-react";
import { memo } from "react";
import { StateBadge } from "@/features/hazards/components/state-glyph";
import type { AttentionReason, Hazard } from "@/features/hazards/types";
import { relativeAge } from "@/features/hazards/utils/dates";
import { addressText, ATTENTION_LABELS, formatInspectedDate, photoCountText } from "@/features/hazards/utils/display";
import { cn } from "@/lib/utils";

const ATTENTION_ICONS: Record<AttentionReason, typeof CameraOff> = {
  no_photo: CameraOff,
  no_comment: MessageSquareOff,
};

type HazardListItemProps = {
  hazard: Hazard;
  isSelected: boolean;
  onSelect: (assetId: string) => void;
};

function HazardListItemComponent({ hazard, isSelected, onSelect }: HazardListItemProps) {
  const snippet = hazard.comments ?? addressText(hazard);

  return (
    <li data-asset-id={hazard.assetId}>
      <button
        type="button"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onSelect(hazard.assetId)}
        className={cn(
          "block w-full border-l-4 px-4 py-3 text-left transition-colors hover:bg-accent motion-reduce:transition-none",
          isSelected ? "border-l-denim bg-accent" : "border-l-transparent",
        )}
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-charcoal">{hazard.assetId}</span>
          <StateBadge state={hazard.state} />
        </span>
        <span className="mt-1 flex flex-wrap gap-x-1.5 text-xs text-city-dark">
          <span>{hazard.crewCode ?? "No station"}</span>
          <span aria-hidden="true">·</span>
          <span>{formatInspectedDate(hazard.inspectedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{relativeAge(hazard.ageDays)}</span>
        </span>
        {/* Comments are free text from the field, so they only ever render as React text. */}
        {snippet ? <span className="mt-1 block truncate text-sm text-muted-foreground">{snippet}</span> : null}
        {hazard.photoCount > 0 || hazard.attentionReasons.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {hazard.photoCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-city-light bg-city-gray px-2 py-0.5 text-xs font-semibold text-city-dark">
                <Camera aria-hidden="true" className="size-3.5" />
                {photoCountText(hazard.photoCount)}
              </span>
            ) : null}
            {hazard.attentionReasons.map((reason) => {
              const Icon = ATTENTION_ICONS[reason];
              return (
                <span
                  key={reason}
                  className="inline-flex items-center gap-1 rounded-full border border-fire-red/30 bg-fire-red/8 px-2 py-0.5 text-xs font-semibold text-fire-red"
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {ATTENTION_LABELS[reason]}
                </span>
              );
            })}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export const HazardListItem = memo(HazardListItemComponent);
