import type { ReactNode } from "react";
import { StateBadge } from "@/features/hazards/components/state-glyph";
import type { Hazard } from "@/features/hazards/types";
import { addressText, formatInspectedDate } from "@/features/hazards/utils/display";

const LONG_COMMENT = 160;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.75rem_1fr] gap-x-3 py-1.5">
      <dt className="text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">{label}</dt>
      <dd className="min-w-0 break-words text-city-dark">{children}</dd>
    </div>
  );
}

/** Comments are free text from the field, so they are only ever rendered as React text. */
export function HazardPopupContent({ hazard }: { hazard: Hazard }) {
  const address = addressText(hazard);
  const isLong = (hazard.comments?.length ?? 0) > LONG_COMMENT;

  return (
    <article aria-label={`Asset ${hazard.assetId}`} className="p-4">
      <header className="flex flex-wrap items-center gap-2 pr-8">
        <h2 className="font-mono text-base font-semibold text-charcoal">{hazard.assetId}</h2>
        <StateBadge state={hazard.state} />
      </header>
      <dl className="mt-2 divide-y divide-city-light">
        <Row label="Inspected">
          {hazard.inspectedAt ? (
            <time dateTime={hazard.inspectedAt}>{formatInspectedDate(hazard.inspectedAt)}</time>
          ) : (
            formatInspectedDate(null)
          )}
        </Row>
        <Row label="Station/Shift">{hazard.crewCode ?? "Not recorded"}</Row>
        {address ? <Row label="Address">{address}</Row> : null}
        {hazard.comments ? (
          <Row label="Comments">
            {isLong ? (
              // Scrolls inside the popup so a long note never pushes it past the map.
              <p tabIndex={0} aria-label="Comments" className="max-h-28 overflow-y-auto pr-1 whitespace-pre-line">
                {hazard.comments}
              </p>
            ) : (
              <p className="whitespace-pre-line">{hazard.comments}</p>
            )}
          </Row>
        ) : null}
      </dl>
    </article>
  );
}
