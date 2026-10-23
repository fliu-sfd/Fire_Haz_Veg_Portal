"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HazardSearchInputProps = {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
};

export function HazardSearchInput({ value, maxLength, onChange, onClear, className }: HazardSearchInputProps) {
  const id = useId();
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        Search asset ID or address
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type="search"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search asset ID or address"
        autoComplete="off"
        className="h-10 bg-white pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-deep-blue"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
