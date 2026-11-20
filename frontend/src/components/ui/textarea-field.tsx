import type { ReactNode, TextareaHTMLAttributes } from "react";

export type TextareaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "aria-describedby" | "className" | "id"
> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Shown under the box, for example "128 of 500". */
  counter?: ReactNode;
  containerClassName?: string;
};

export function TextareaField({
  id,
  label,
  hint,
  error,
  counter,
  containerClassName = "",
  ...textareaProps
}: TextareaFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const counterId = counter ? `${id}-counter` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, counterId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm font-semibold text-charcoal">{label}</label>
      {hint ? <p id={hintId} className="mt-1 text-sm leading-5 text-city-dark">{hint}</p> : null}
      <textarea
        {...textareaProps}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="mt-2 block w-full rounded border bg-white px-3 py-2 text-base text-charcoal shadow-sm transition placeholder:text-silver-spur hover:border-silver-spur focus:border-denim focus:outline-none focus:ring-4 focus:ring-denim/15 disabled:cursor-not-allowed disabled:bg-city-light disabled:text-city-dark read-only:bg-city-light read-only:text-city-dark aria-[invalid=true]:border-fire-red aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-fire-red/10"
      />
      {counter ? <p id={counterId} className="mt-1 text-right text-sm text-city-dark">{counter}</p> : null}
      {error ? <p id={errorId} className="mt-2 text-sm font-semibold text-fire-red">{error}</p> : null}
    </div>
  );
}
