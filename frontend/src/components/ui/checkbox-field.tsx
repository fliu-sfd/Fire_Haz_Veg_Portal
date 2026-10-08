import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-describedby" | "className" | "id" | "type"
> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
};

export function CheckboxField({
  id,
  label,
  hint,
  error,
  containerClassName = "",
  ...inputProps
}: CheckboxFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={containerClassName}>
      <div className="flex items-start gap-3">
        <input
          {...inputProps}
          id={id}
          type="checkbox"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border border-silver-spur accent-denim focus:outline-none focus:ring-4 focus:ring-denim/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <label htmlFor={id} className="text-sm leading-5 text-charcoal">{label}</label>
      </div>
      {hint ? <p id={hintId} className="ml-8 mt-1 text-sm leading-5 text-city-dark">{hint}</p> : null}
      {error ? <p id={errorId} className="ml-8 mt-2 text-sm font-semibold text-fire-red">{error}</p> : null}
    </div>
  );
}
