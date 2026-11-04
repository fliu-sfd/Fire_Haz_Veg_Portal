import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import { HazardsView } from "./hazards-view";

export const metadata: Metadata = {
  title: "Hazard map",
  description: "See open and closed vegetation hazards on a map.",
};

export default function HazardsPage() {
  // useSearchParams in HazardsView needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<Loader label="Loading hazard map…" />}>
      <HazardsView />
    </Suspense>
  );
}
