"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";
import { StateGlyph } from "@/features/hazards/components/state-glyph";
import type { HazardState, PropertyType } from "@/features/hazards/types";
import {
  PROPERTY_TYPE_LABELS,
  selectionLabel,
  stateLabel,
  type FilterChip,
} from "@/features/hazards/utils/display";
import { HAZARD_STATES } from "@/features/hazards/utils/query-params";
import { cn } from "@/lib/utils";

export type HazardFilterBarProps = {
  states: readonly HazardState[];
  crews: readonly string[];
  crewOptions: readonly string[];
  propertyType: PropertyType | null;
  propertyTypeOptions: readonly PropertyType[];
  chips: readonly FilterChip[];
  activeCount: number;
  onToggleStatus: (state: HazardState) => void;
  onToggleCrew: (crew: string) => void;
  onResetCrews: () => void;
  onPropertyTypeChange: (type: PropertyType | null) => void;
  onRemoveChip: (chip: FilterChip) => void;
  onClearFilters: () => void;
  /** The result line, shown beside the chips so the row never sits empty. */
  summary: ReactNode;
};

const activeClass = "border-denim bg-accent text-deep-blue";
const menuLabelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";
// Keep the menu open so several options can be picked in a row.
const keepOpen = (event: Event) => event.preventDefault();

function StatusMenu({ states, onToggleStatus }: Pick<HazardFilterBarProps, "states" | "onToggleStatus">) {
  const isAll = states.length === HAZARD_STATES.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(toolbarButtonClass, !isAll && activeClass)}>
        {selectionLabel("Status", states.map(stateLabel), isAll)}
        <ChevronDown aria-hidden="true" className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className={menuLabelClass}>Show hazards that are</DropdownMenuLabel>
        {HAZARD_STATES.map((state) => {
          const checked = states.includes(state);
          return (
            <DropdownMenuCheckboxItem
              key={state}
              checked={checked}
              // One status always stays on, so the map is never filtered to nothing by accident.
              disabled={checked && states.length === 1}
              onSelect={keepOpen}
              onCheckedChange={() => onToggleStatus(state)}
            >
              <StateGlyph state={state} className="size-4" />
              {stateLabel(state)}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CrewMenu({
  crews,
  crewOptions,
  onToggleCrew,
  onResetCrews,
}: Pick<HazardFilterBarProps, "crews" | "crewOptions" | "onToggleCrew" | "onResetCrews">) {
  const isAll = crews.length === 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={crewOptions.length === 0}
        className={cn(toolbarButtonClass, !isAll && activeClass)}
      >
        {selectionLabel("Station/Shift", crews, isAll)}
        <ChevronDown aria-hidden="true" className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className={menuLabelClass}>Station/Shift</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={isAll}
          onSelect={(event) => {
            event.preventDefault();
            onResetCrews();
          }}
        >
          All stations and shifts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {crewOptions.map((crew) => (
            <DropdownMenuCheckboxItem
              key={crew}
              checked={crews.includes(crew)}
              onSelect={keepOpen}
              onCheckedChange={() => onToggleCrew(crew)}
              className="font-mono"
            >
              {crew}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PropertyTypeControl({
  propertyType,
  propertyTypeOptions,
  onPropertyTypeChange,
}: Pick<HazardFilterBarProps, "propertyType" | "propertyTypeOptions" | "onPropertyTypeChange">) {
  const name = useId();
  if (propertyTypeOptions.length === 0) return null;
  const options: { value: PropertyType | null; label: string }[] = [
    { value: null, label: "All" },
    ...propertyTypeOptions.map((value) => ({ value, label: PROPERTY_TYPE_LABELS[value] })),
  ];

  return (
    <fieldset className="flex h-10 items-center rounded-md border border-input bg-white p-0.5 shadow-xs">
      <legend className="sr-only">Property type</legend>
      {options.map((option) => (
        <label key={option.label} className="relative">
          <input
            type="radio"
            name={name}
            checked={propertyType === option.value}
            onChange={() => onPropertyTypeChange(option.value)}
            className="peer sr-only"
          />
          <span className="flex h-8 cursor-pointer items-center rounded px-3 text-sm font-semibold text-city-dark transition-colors peer-checked:bg-deep-blue peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-denim hover:bg-accent peer-checked:hover:bg-deep-blue motion-reduce:transition-none">
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function CheckboxRow({ checked, disabled, onChange, children }: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex min-h-11 items-center gap-3 rounded-md px-2 text-sm", disabled ? "opacity-60" : "cursor-pointer hover:bg-accent")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="size-4 accent-denim" />
      {children}
    </label>
  );
}

function MobileFilters(props: HazardFilterBarProps) {
  const [open, setOpen] = useState(false);
  const { states, crews, crewOptions, activeCount, onToggleStatus, onToggleCrew, onClearFilters } = props;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={cn(toolbarButtonClass, "sm:hidden", activeCount > 0 && activeClass)}>
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-deep-blue text-xs text-white">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-xl">
        <SheetHeader className="border-b border-city-light">
          <SheetTitle>Filter hazards</SheetTitle>
          <SheetDescription>Changes apply to the map right away.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto p-4">
          <fieldset>
            <legend className={menuLabelClass}>Status</legend>
            <div className="mt-1">
              {HAZARD_STATES.map((state) => {
                const checked = states.includes(state);
                return (
                  <CheckboxRow
                    key={state}
                    checked={checked}
                    disabled={checked && states.length === 1}
                    onChange={() => onToggleStatus(state)}
                  >
                    <StateGlyph state={state} className="size-5" />
                    {stateLabel(state)}
                  </CheckboxRow>
                );
              })}
            </div>
          </fieldset>
          {crewOptions.length > 0 ? (
            <fieldset>
              <legend className={menuLabelClass}>Station/Shift</legend>
              <div className="mt-1 grid grid-cols-3 gap-x-2">
                {crewOptions.map((crew) => (
                  <CheckboxRow key={crew} checked={crews.includes(crew)} onChange={() => onToggleCrew(crew)}>
                    <span className="font-mono">{crew}</span>
                  </CheckboxRow>
                ))}
              </div>
            </fieldset>
          ) : null}
          {props.propertyTypeOptions.length > 0 ? (
            <div>
              <p className={menuLabelClass}>Property type</p>
              <div className="mt-2">
                <PropertyTypeControl {...props} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-city-light p-4">
          <button
            type="button"
            disabled={activeCount === 0}
            onClick={onClearFilters}
            className={cn(toolbarButtonClass, "h-11 flex-1")}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 flex-1 rounded-md bg-denim px-4 text-sm font-semibold text-white hover:bg-deep-blue"
          >
            Show map
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function HazardFilterBar(props: HazardFilterBarProps) {
  const { chips, activeCount, onRemoveChip, onClearFilters, summary } = props;

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
        <MobileFilters {...props} />
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <StatusMenu {...props} />
          <CrewMenu {...props} />
          <PropertyTypeControl {...props} />
        </div>
      </div>
      {/* A fixed minimum height, so chips appearing never shift the map. */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2 sm:min-h-8">
        {chips.length > 0 ? (
          <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <li key={chip.id}>
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip)}
                  aria-label={`Remove filter ${chip.label}`}
                  className="inline-flex h-10 items-center gap-1 rounded-full border border-denim/30 bg-accent pr-2 pl-3 text-xs font-semibold text-deep-blue transition-colors hover:border-denim hover:bg-denim/15 motion-reduce:transition-none sm:h-8"
                >
                  {chip.label}
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
            {activeCount > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="inline-flex h-10 items-center rounded-md px-2 text-xs font-semibold text-civic-blue underline-offset-4 hover:underline sm:h-8"
                >
                  Clear all
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="text-sm text-city-dark sm:ml-auto sm:text-right">{summary}</div>
      </div>
    </div>
  );
}
