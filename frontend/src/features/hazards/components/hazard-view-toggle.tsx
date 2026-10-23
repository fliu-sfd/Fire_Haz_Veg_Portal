import { List, MapIcon } from "lucide-react";
import type { WorkspaceView } from "@/features/hazards/types";
import { cn } from "@/lib/utils";

const OPTIONS: { id: WorkspaceView; label: string; Icon: typeof List }[] = [
  { id: "map", label: "Map", Icon: MapIcon },
  { id: "list", label: "List", Icon: List },
];

/** Narrow screens show the map or the list; from 1024 px both sit side by side and this hides. */
export function HazardViewToggle({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return (
    <div role="group" aria-label="Show" className="grid grid-cols-2 rounded-md border border-input bg-white p-0.5 shadow-xs lg:hidden">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded text-sm font-semibold transition-colors motion-reduce:transition-none",
            view === id ? "bg-deep-blue text-white" : "text-city-dark hover:bg-accent",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
