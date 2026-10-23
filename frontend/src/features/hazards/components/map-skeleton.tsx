import { MapPinned } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton() {
  return (
    <div role="status" className="relative h-full w-full">
      <Skeleton className="absolute inset-0 rounded-none bg-city-light motion-reduce:animate-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <MapPinned aria-hidden="true" className="size-8" />
        <span className="text-sm font-semibold">Loading map…</span>
      </div>
    </div>
  );
}
