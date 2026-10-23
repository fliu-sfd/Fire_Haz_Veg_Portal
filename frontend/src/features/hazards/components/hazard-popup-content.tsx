import type { ReactNode } from "react";
import { CopyLinkButton } from "@/features/hazards/components/copy-link-button";
import { StateBadge } from "@/features/hazards/components/state-glyph";
import type { Hazard } from "@/features/hazards/types";
import { relativeAge } from "@/features/hazards/utils/dates";
import { addressText, formatInspectedDate, photoCountText } from "@/features/hazards/utils/display";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.25rem_1fr] gap-x-3 py-1">
      <dt className="text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">{label}</dt>
      <dd className="min-w-0 break-words text-city-dark">{children}</dd>
    </div>
  );
}

/** Comments are free text from the field, so they are only ever rendered as React text. */
export function HazardPopupContent({ hazard }: { hazard: Hazard }) {
  const address = addressText(hazard);

  return (
    // Scrolls inside itself so the popup always fits a short map; focusable so the keyboard can scroll it.
    <article tabIndex={0} aria-label={`Asset ${hazard.assetId}`} className="max-h-[17rem] overflow-y-auto p-3.5">
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
        <Row label="Days since inspection">{relativeAge(hazard.ageDays)}</Row>
        <Row label="Station/Shift">{hazard.crewCode ?? "Not recorded"}</Row>
        <Row label="Photos">{photoCountText(hazard.photoCount)}</Row>
        {address ? <Row label="Address">{address}</Row> : null}
        {hazard.comments ? (
          <Row label="Comments">
            <p className="whitespace-pre-line">{hazard.comments}</p>
          </Row>
        ) : null}
      </dl>
      <div className="mt-2 border-t border-city-light pt-2.5">
        <CopyLinkButton />
      </div>
    </article>
  );
}
