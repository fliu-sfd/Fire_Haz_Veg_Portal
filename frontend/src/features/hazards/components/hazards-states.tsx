import { AlertTriangle, Info, MapPinOff, SearchX, ShieldAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { missingAssetMessage } from "@/features/hazards/utils/selection";

type StateCardProps = {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
};

function StateCard({ icon, title, children, action, role }: StateCardProps) {
  return (
    <div
      role={role}
      className="pointer-events-auto flex max-w-sm flex-col items-center rounded-lg border border-city-light bg-white px-6 py-8 text-center shadow-[0_12px_32px_rgba(26,35,40,0.12)]"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-civic-blue">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-charcoal">{title}</h2>
      {children ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function NoMatchingHazards({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <StateCard
      role="status"
      icon={<SearchX aria-hidden="true" className="size-6" />}
      title="No hazards match these filters"
      action={<Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>}
    >
      Try another status or station, or clear the filters to see every hazard.
    </StateCard>
  );
}

export function NoHazardsRecorded() {
  return (
    <StateCard role="status" icon={<MapPinOff aria-hidden="true" className="size-6" />} title="No hazards recorded">
      Hazards appear here once an inspection file with open issues has been imported.
    </StateCard>
  );
}

type HazardsErrorProps = { message: string; isRetrying: boolean; onRetry: () => void };

export function HazardsError({ message, isRetrying, onRetry }: HazardsErrorProps) {
  return (
    <StateCard
      role="alert"
      icon={<AlertTriangle aria-hidden="true" className="size-6 text-fire-red" />}
      title="We could not load hazards"
      action={
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      }
    >
      {message}
    </StateCard>
  );
}

export function HazardsAccessRequired() {
  return (
    <StateCard role="alert" icon={<ShieldAlert aria-hidden="true" className="size-6" />} title="Administrator access required">
      Your account does not have permission to view the hazard map. Contact an administrator if you need access.
    </StateCard>
  );
}

export function UpdatingPill() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-city-light bg-white px-3 py-1.5 text-xs font-semibold text-city-dark shadow-md">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-denim motion-reduce:animate-none" />
      Updating
    </span>
  );
}

type MissingAssetNoticeProps = { assetId: string; onClearFilters: () => void; onDismiss: () => void };

export function MissingAssetNotice({ assetId, onClearFilters, onDismiss }: MissingAssetNoticeProps) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-lg border border-denim/30 bg-white px-4 py-3 text-sm text-city-dark shadow-[0_12px_32px_rgba(26,35,40,0.12)]"
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-civic-blue" />
      <p className="flex-1">
        {missingAssetMessage(assetId)}{" "}
        <button type="button" onClick={onClearFilters} className="font-semibold text-civic-blue underline underline-offset-4">
          Clear filters
        </button>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notice"
        className="-m-1 flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-deep-blue"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
