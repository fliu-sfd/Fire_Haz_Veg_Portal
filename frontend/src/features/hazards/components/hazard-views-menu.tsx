"use client";

import { Bookmark, ChevronDown, Trash2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { toolbarButtonClass } from "@/features/admin/components/toolbar-button";
import { VIEW_NAME_MAX_LENGTH, viewNameProblem, type SavedView, type ViewNameProblem } from "@/features/hazards/utils/views";
import { cn } from "@/lib/utils";

type HazardViewsMenuProps = {
  views: SavedView[];
  isFull: boolean;
  canSave: (name: string) => boolean;
  onApply: (view: SavedView) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
  className?: string;
};

const NAME_MESSAGES: Record<Exclude<ViewNameProblem, null>, string> = {
  required: "Enter a name for this view.",
  too_long: `Use ${VIEW_NAME_MAX_LENGTH} characters or fewer.`,
};
const FULL_MESSAGE = "Delete a view to save another.";

export function HazardViewsMenu({ views, isFull, canSave, onApply, onSave, onDelete, className }: HazardViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const nameId = useId();
  const messageId = useId();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setIsSaving(false);
      setName("");
      setMessage(null);
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const problem = viewNameProblem(name);
    if (problem) return setMessage(NAME_MESSAGES[problem]);
    if (!canSave(name)) return setMessage(FULL_MESSAGE);
    onSave(name);
    handleOpenChange(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger className={cn(toolbarButtonClass, className)}>
        <Bookmark aria-hidden="true" className="size-4" />
        Views
        <ChevronDown aria-hidden="true" className="size-4 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          aria-label="Saved views"
          className="z-50 w-72 rounded-md border border-city-light bg-white p-2 shadow-md"
        >
          <p className="px-2 pt-1 pb-2 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Saved views</p>
          {views.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted-foreground">No saved views yet. Save the filters you use most.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {views.map((view) => (
                <li key={view.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(view);
                      handleOpenChange(false);
                    }}
                    className="flex min-h-10 min-w-0 flex-1 items-center rounded-md px-2 text-left text-sm text-city-dark hover:bg-accent"
                  >
                    <span className="truncate">{view.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete view ${view.name}`}
                    onClick={() => onDelete(view.name)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-fire-red/10 hover:text-fire-red"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 border-t border-city-light pt-2">
            {isSaving ? (
              <form onSubmit={handleSave} noValidate className="space-y-2 px-1">
                <label htmlFor={nameId} className="block text-xs font-semibold text-city-dark">
                  View name
                </label>
                <input
                  id={nameId}
                  autoFocus
                  value={name}
                  maxLength={VIEW_NAME_MAX_LENGTH + 10}
                  onChange={(event) => {
                    setName(event.target.value);
                    setMessage(null);
                  }}
                  aria-invalid={message !== null}
                  aria-describedby={message ? messageId : undefined}
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm aria-invalid:border-fire-red"
                />
                {message ? (
                  <p id={messageId} role="alert" className="text-xs font-semibold text-fire-red">
                    {message}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">Saves the filters and sort. A name already in use is replaced.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsSaving(false)} className={cn(toolbarButtonClass, "flex-1")}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 flex-1 rounded-md bg-denim px-3 text-sm font-semibold text-white hover:bg-deep-blue"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsSaving(true)}
                  className="flex min-h-10 w-full items-center rounded-md px-2 text-left text-sm font-semibold text-civic-blue hover:bg-accent"
                >
                  Save current view
                </button>
                {isFull ? <p className="px-2 pb-1 text-xs text-muted-foreground">{FULL_MESSAGE} Saving over an existing name still works.</p> : null}
              </>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
