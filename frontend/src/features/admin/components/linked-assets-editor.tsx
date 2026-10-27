"use client";

import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import type { Confirmation } from "@/features/admin/utils/user-form";

type LinkedAssetsEditorProps = {
  assetIds: readonly string[];
  input: string;
  inputError?: string;
  alert?: string;
  notice?: string;
  isAdding: boolean;
  removingAssetId: string | null;
  confirmation: Confirmation | null;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (assetId: string) => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
};

export function LinkedAssetsEditor({
  assetIds,
  input,
  inputError,
  alert,
  notice,
  isAdding,
  removingAssetId,
  confirmation,
  onInputChange,
  onAdd,
  onRemove,
  onConfirmRemove,
  onCancelRemove,
}: LinkedAssetsEditorProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const busy = isAdding || removingAssetId !== null;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h3 id={headingId} className="text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">
        Linked properties
      </h3>
      <p className="text-sm leading-5 text-city-dark">Changes here save right away.</p>

      {alert ? <FormAlert variant="error" title="The property change was not saved">{alert}</FormAlert> : null}

      {assetIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked properties.</p>
      ) : (
        <ul aria-label="Linked asset IDs" className="flex flex-wrap gap-2">
          {assetIds.map((assetId) => (
            <li
              key={assetId}
              className="inline-flex items-center gap-1 rounded-full border border-city-light bg-city-gray py-1 pr-1 pl-3 font-mono text-sm text-city-dark"
            >
              {assetId}
              <button
                type="button"
                aria-label={`Remove ${assetId}`}
                disabled={busy}
                onClick={() => onRemove(assetId)}
                className="inline-flex size-6 items-center justify-center rounded-full text-city-dark hover:bg-fire-red/10 hover:text-fire-red disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor={inputId} className="block text-sm font-semibold text-charcoal">
          Add an asset ID
        </label>
        <p id={hintId} className="mt-1 text-sm leading-5 text-city-dark">
          The number on the door tag. It must exist in the inspection data.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            value={input}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-describedby={inputError ? `${hintId} ${errorId}` : hintId}
            aria-invalid={inputError ? true : undefined}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              // This input sits inside the edit form; Enter adds the asset instead of saving the form.
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
            className="block h-11 min-w-0 flex-1 rounded border bg-white px-3 font-mono text-base text-charcoal uppercase shadow-sm transition hover:border-silver-spur focus:border-denim focus:ring-4 focus:ring-denim/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-city-light aria-[invalid=true]:border-fire-red aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-fire-red/10"
          />
          <Button variant="secondary" onClick={onAdd} disabled={busy} className="inline-flex items-center gap-1.5">
            <Plus aria-hidden="true" className="size-4" />
            {isAdding ? "Adding…" : "Add"}
          </Button>
        </div>
        {inputError ? (
          <p id={errorId} className="mt-2 text-sm font-semibold text-fire-red">
            {inputError}
          </p>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="text-sm font-semibold text-success-dark">
        {removingAssetId ? `Removing ${removingAssetId}…` : notice ?? ""}
      </p>

      <ConfirmDialog confirmation={confirmation} onConfirm={onConfirmRemove} onCancel={onCancelRemove} />
    </section>
  );
}
