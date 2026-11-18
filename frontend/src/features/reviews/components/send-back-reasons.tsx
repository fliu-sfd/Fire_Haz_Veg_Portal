import { useId } from "react";
import { canAddReason, hasReason } from "../utils/send-back-reasons";
import type { SendBackReason } from "../utils/send-back-reasons";

export function SendBackReasons({ reasons, comment, disabled = false, onPick }: {
  reasons: readonly SendBackReason[];
  comment: string;
  disabled?: boolean;
  onPick: (reason: SendBackReason) => void;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="text-sm font-semibold text-charcoal">Quick reasons (tap to add)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {reasons.map((reason) => {
          const added = hasReason(comment, reason);
          const unavailable = disabled || !canAddReason(comment, reason);
          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => onPick(reason)}
              disabled={unavailable}
              aria-pressed={added}
              title={reason.text}
              className="min-h-11 rounded-full border border-civic-blue bg-white px-4 py-2 text-sm font-medium text-civic-blue transition-colors hover:bg-civic-blue hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim disabled:cursor-not-allowed disabled:border-city-light disabled:bg-city-light/30 disabled:text-city-dark disabled:hover:bg-city-light/30 disabled:hover:text-city-dark"
            >
              {added ? <span aria-hidden="true">✓ </span> : null}{reason.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
