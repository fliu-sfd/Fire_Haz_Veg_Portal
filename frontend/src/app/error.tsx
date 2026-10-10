"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <h1 className="text-3xl font-light text-charcoal">We couldn’t load this page.</h1>
      <p className="text-city-dark">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
