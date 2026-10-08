"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <h1 className="text-2xl font-bold">We couldn’t load this page.</h1>
      <p className="text-slate-600">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
