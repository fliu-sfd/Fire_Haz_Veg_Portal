"use client";

import { Columns3, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnConfig } from "@/features/admin/utils/columns";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";

type ColumnVisibilityMenuProps<Id extends string> = {
  columns: readonly ColumnConfig<Id>[];
  visible: readonly Id[];
  canHide: (id: Id) => boolean;
  onToggle: (id: Id) => void;
  onShowAll: () => void;
};

export function ColumnVisibilityMenu<Id extends string>({
  columns,
  visible,
  canHide,
  onToggle,
  onShowAll,
}: ColumnVisibilityMenuProps<Id>) {
  const allVisible = visible.length === columns.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Choose columns" className={toolbarButtonClass}>
        <Columns3 aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Columns</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Show columns
        </DropdownMenuLabel>
        {columns.map((column) => {
          const checked = visible.includes(column.id);
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={checked}
              disabled={checked && !canHide(column.id)}
              // Keep the menu open so several columns can be toggled in a row.
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggle(column.id)}
            >
              {column.label}
              {column.locked ? (
                <Lock aria-label="Always shown" className="ml-auto size-3.5 text-muted-foreground" />
              ) : null}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={allVisible} onSelect={(event) => { event.preventDefault(); onShowAll(); }}>
          Show all columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
