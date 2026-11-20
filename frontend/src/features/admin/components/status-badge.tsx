import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The word carries the meaning; color and the dot only support it. */
export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(
        "font-semibold",
        isActive
          ? "border-success-dark/30 bg-success-green/10 text-success-dark"
          : "border-silver-spur/40 bg-city-light text-city-dark",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", isActive ? "bg-success-dark" : "bg-silver-spur")}
      />
      {isActive ? "Active" : "Disabled"}
    </Badge>
  );
}
