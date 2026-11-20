"use client";

import { useEffect, useId, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

type AddPropertyFormProps = {
  value: string;
  fieldError?: string;
  alert?: string;
  isSaving: boolean;
  /** The input takes focus each time this number goes up. */
  focusSignal: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function AddPropertyForm({ value, fieldError, alert, isSaving, focusSignal, onChange, onSubmit }: AddPropertyFormProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4 rounded border border-city-light bg-city-gray p-4 sm:p-5">
      {alert ? <FormAlert variant="error" title="We could not add this property">{alert}</FormAlert> : null}
      <div>
        <label htmlFor={inputId} className="block text-sm font-semibold text-charcoal">Asset ID</label>
        <p id={hintId} className="mt-1 text-sm leading-5 text-city-dark">Find it on the tag left at your door.</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            id={inputId}
            name="asset_id"
            value={value}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={fieldError ? `${hintId} ${errorId}` : hintId}
            aria-invalid={fieldError ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
            className="block h-12 w-full min-w-0 rounded border bg-white px-3 text-base text-charcoal shadow-sm transition hover:border-silver-spur focus:border-denim focus:ring-4 focus:ring-denim/15 focus:outline-none aria-[invalid=true]:border-fire-red aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-fire-red/10 sm:flex-1"
          />
          <Button type="submit" disabled={isSaving} className="min-h-12 shrink-0">
            {isSaving ? "Adding…" : "Add property"}
          </Button>
        </div>
        {fieldError ? <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-fire-red">{fieldError}</p> : null}
      </div>
    </form>
  );
}
