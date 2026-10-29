import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading your profile" className="space-y-6">
      <div className="flex items-center gap-5 rounded-lg border border-city-light bg-white p-6 sm:p-7">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

type ProfileLoadErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export function ProfileLoadError({ message, isRetrying, onRetry }: ProfileLoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-city-light bg-white px-6 py-14 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent">
        <AlertTriangle aria-hidden="true" className="size-6 text-fire-red" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-charcoal">We could not load your profile</h1>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      <Button className="mt-5" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
