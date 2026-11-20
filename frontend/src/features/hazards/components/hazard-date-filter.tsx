"use client";

import { Check, ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";
import {
  DATE_PRESETS,
  DATE_RANGE_MESSAGES,
  dateRangeProblem,
  formatDateRange,
  type DatePreset,
  type DateRange,
} from "@/features/hazards/utils/dates";
import { cn } from "@/lib/utils";

export type DateFilterProps = {
  range: DateRange;
  activePreset: DatePreset | "custom" | null;
  onPreset: (preset: DatePreset) => void;
  onCustom: (from: string | null, to: string | null) => void;
  onClear: () => void;
};

const optionClass =
  "flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm text-city-dark hover:bg-accent aria-pressed:font-semibold aria-pressed:text-deep-blue";

/** Presets and a custom range; shared by the desktop popover and the phone sheet. */
export function DateFilterPanel({ range, activePreset, onPreset, onCustom, onClear, onDone }: DateFilterProps & { onDone?: () => void }) {
  const [from, setFrom] = useState(range.from ?? "");
  const [to, setTo] = useState(range.to ?? "");
  const [problem, setProblem] = useState<ReturnType<typeof dateRangeProblem>>(null);
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  function applyCustom(event: FormEvent) {
    event.preventDefault();
    const found = dateRangeProblem(from, to);
    setProblem(found);
    if (found) return;
    onCustom(from || null, to || null);
    onDone?.();
  }

  const options: { id: DatePreset | null; label: string }[] = [{ id: null, label: "Any time" }, ...DATE_PRESETS];

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Inspected" className="space-y-0.5">
        {options.map((option) => {
          const pressed = activePreset === option.id;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                if (option.id) onPreset(option.id);
                else onClear();
                onDone?.();
              }}
              className={optionClass}
            >
              {option.label}
              {pressed ? <Check aria-hidden="true" className="size-4" /> : null}
            </button>
          );
        })}
      </div>
      <form onSubmit={applyCustom} noValidate className="space-y-2 border-t border-city-light pt-3">
        <p className="px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          Custom range{activePreset === "custom" ? " (in use)" : ""}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={fromId} className="block px-1 text-xs font-semibold text-city-dark">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-invalid={problem === "invalid_from" || problem === "reversed"}
              aria-describedby={problem ? errorId : undefined}
              className="mt-1 h-10 w-full rounded-md border border-input bg-white px-2 text-sm aria-invalid:border-fire-red"
            />
          </div>
          <div>
            <label htmlFor={toId} className="block px-1 text-xs font-semibold text-city-dark">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-invalid={problem === "invalid_to" || problem === "reversed"}
              aria-describedby={problem ? errorId : undefined}
              className="mt-1 h-10 w-full rounded-md border border-input bg-white px-2 text-sm aria-invalid:border-fire-red"
            />
          </div>
        </div>
        {problem ? (
          <p id={errorId} role="alert" className="px-1 text-xs font-semibold text-fire-red">
            {DATE_RANGE_MESSAGES[problem]}
          </p>
        ) : null}
        <button
          type="submit"
          className="h-10 w-full rounded-md bg-denim px-3 text-sm font-semibold text-white hover:bg-deep-blue"
        >
          Apply range
        </button>
      </form>
    </div>
  );
}

export function HazardDateFilter(props: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = props.activePreset !== null;
  const presetLabel = DATE_PRESETS.find((preset) => preset.id === props.activePreset)?.label;
  const label = !isActive ? "Inspected" : `Inspected: ${presetLabel ?? formatDateRange(props.range)}`;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={cn(toolbarButtonClass, isActive && "border-denim bg-accent text-deep-blue")}>
        <span className="max-w-64 truncate">{label}</span>
        <ChevronDown aria-hidden="true" className="size-4 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          aria-label="Inspected date"
          className="z-50 w-72 rounded-md border border-city-light bg-white p-2 shadow-md"
        >
          {/* Keyed so reopening starts from the range in use, not an abandoned draft. */}
          <DateFilterPanel key={`${props.range.from}|${props.range.to}`} {...props} onDone={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
