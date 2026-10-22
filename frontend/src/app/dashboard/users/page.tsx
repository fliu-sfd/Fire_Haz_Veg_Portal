import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersView } from "./users-view";

export const metadata: Metadata = {
  title: "Users",
  description: "Search and review portal accounts.",
};

export default function UsersPage() {
  // useSearchParams in UsersView needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<p role="status" className="text-city-dark">Loading users…</p>}>
      <UsersView />
    </Suspense>
  );
}
