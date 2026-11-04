import useSWR from "swr";
import { accessProblem } from "@/features/admin/utils/errors";
import { listMessages } from "@/features/settings/api";
import { messagesLoadError } from "@/features/settings/utils/errors";

/** Cleared with every other entry by the shell's cache wipe on sign out. */
export const MESSAGES_KEY = "admin/settings/messages";

/** Pass false to hold the request until the role check passes. */
export function useMessages(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(enabled ? MESSAGES_KEY : null, listMessages, {
    // A refetch while an admin is typing would change the text the forms compare with.
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    messages: data,
    errorMessage: error ? messagesLoadError(error) : undefined,
    accessProblem: accessProblem(error),
    isLoading: isLoading && !data,
    isRetrying: isValidating && Boolean(error),
    retry: () => void mutate(),
  };
}
