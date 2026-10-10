import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "aria-describedby" | "className" | "id"
> & {
  id: string;
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
};

export function SelectField({
  id,
  label,
  children,
  hint,
  error,
  optional = false,
  containerClassName = "",
  ...selectProps
}: SelectFieldProps) {
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
        <select
          {...selectProps}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="block h-12 w-full appearance-none rounded border bg-white px-3 pr-10 text-base text-charcoal shadow-sm transition hover:border-silver-spur focus:border-denim focus:outline-none focus:ring-4 focus:ring-denim/15 disabled:cursor-not-allowed disabled:bg-city-light disabled:text-city-dark aria-[invalid=true]:border-fire-red aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-fire-red/10"
        >
          {children}
        </select>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-city-dark">
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error ? <p id={errorId} className="mt-2 text-sm font-semibold text-fire-red">{error}</p> : null}
    </div>
  );
}
