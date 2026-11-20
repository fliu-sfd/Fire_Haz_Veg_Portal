import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LoaderProps = {
  /** Announced to screen readers; the icon alone says nothing to them. */
  label: string;
  /** Sits in the flow of a page that is already showing, instead of the middle of the screen. */
  inline?: boolean;
};

export function Loader({ label, inline = false }: LoaderProps) {
  return (
    <div
      role="status"
      // Fixed to the viewport so the icon stays put whether or not the sidebar has rendered yet.
      className={cn(
        "flex items-center justify-center text-civic-blue",
        inline ? "py-8" : "pointer-events-none fixed inset-0",
      )}
    >
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
