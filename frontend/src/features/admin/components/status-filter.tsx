"use client";

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "all", label: "All statuses", isActive: null },
  { value: "active", label: "Active", isActive: true },
  { value: "disabled", label: "Disabled", isActive: false },
] as const;

type StatusFilterProps = {
  value: boolean | null;
  onChange: (isActive: boolean | null) => void;
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const labelId = useId();
  const selected = OPTIONS.find((option) => option.isActive === value) ?? OPTIONS[0];

  return (
    <>
      <span id={labelId} className="sr-only">
        Filter by status
      </span>
      <Select
        value={selected.value}
        onValueChange={(next) => onChange(OPTIONS.find((option) => option.value === next)?.isActive ?? null)}
      >
        <SelectTrigger aria-labelledby={labelId} className="h-10! w-36 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
