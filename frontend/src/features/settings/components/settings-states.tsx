import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-6">
      <Skeleton className="h-[34rem] rounded-lg" />
    </div>
  );
}

type SettingsLoadErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export function SettingsLoadError({ message, isRetrying, onRetry }: SettingsLoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-city-light bg-white px-6 py-14 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent">
        <AlertTriangle aria-hidden="true" className="size-6 text-fire-red" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-charcoal">We could not load the settings</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      <Button className="mt-5" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
