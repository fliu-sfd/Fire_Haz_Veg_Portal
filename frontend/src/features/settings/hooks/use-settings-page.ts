import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useMessages } from "@/features/settings/hooks/use-messages";

/** Everything the page needs except each card's form, which lives with its card. */
export function useSettingsPage() {
  const router = useRouter();
  const { status: access } = useRequireRole("admin");
  const messages = useMessages(access === "allowed");
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (messages.accessProblem === "unauthorized") router.replace("/sign-in");
  }, [messages.accessProblem, router]);

  const reportDirty = useCallback((key: string, isDirty: boolean) => {
    setDirtyKeys((current) => {
      if (current.has(key) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const hasUnsavedChanges = dirtyKeys.size > 0;

  // The browser's own leave prompt, only while a card has unsaved edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  return {
    access,
    messages: messages.messages,
    isLoading: messages.isLoading,
    isForbidden: messages.accessProblem === "forbidden",
    errorMessage: messages.errorMessage,
    isRetrying: messages.isRetrying,
    retry: messages.retry,
    hasUnsavedChanges,
    reportDirty,
  };
}
