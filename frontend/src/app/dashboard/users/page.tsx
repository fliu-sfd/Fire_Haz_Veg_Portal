import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import { UsersView } from "./users-view";

export const metadata: Metadata = {
  title: "Users",
  description: "Search and review portal accounts.",
};

export default function UsersPage() {
  // useSearchParams in UsersView needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<Loader label="Loading users…" />}>
      <UsersView />
    </Suspense>
  );
}
