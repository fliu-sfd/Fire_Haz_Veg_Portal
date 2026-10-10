import type { InputHTMLAttributes, ReactNode } from "react";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-describedby" | "className" | "id"
> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
  inputClassName?: string;
  trailing?: ReactNode;
};

export function TextField({
  id,
  label,
  hint,
  error,
  optional = false,
  containerClassName = "",
  inputClassName = "",
  trailing,
  ...inputProps
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm font-semibold text-charcoal">
        {label}
        {optional ? <span className="ml-1 font-normal text-city-dark">(optional)</span> : null}
      </label>
      {hint ? <p id={hintId} className="mt-1 text-sm leading-5 text-city-dark">{hint}</p> : null}
      <div className="relative mt-2">
        <input
          {...inputProps}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`block h-12 w-full rounded border bg-white px-3 text-base text-charcoal shadow-sm transition placeholder:text-silver-spur hover:border-silver-spur focus:border-denim focus:outline-none focus:ring-4 focus:ring-denim/15 disabled:cursor-not-allowed disabled:bg-city-light disabled:text-city-dark read-only:bg-city-light read-only:text-city-dark aria-[invalid=true]:border-fire-red aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-fire-red/10 ${trailing ? "pr-12" : ""} ${inputClassName}`}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div> : null}
      </div>
      {error ? <p id={errorId} className="mt-2 text-sm font-semibold text-fire-red">{error}</p> : null}
    </div>
  );
}
