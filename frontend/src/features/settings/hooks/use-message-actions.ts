import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { accessProblem } from "@/features/admin/utils/errors";
import { resetMessage, saveMessage } from "@/features/settings/api";
import { MESSAGES_KEY } from "@/features/settings/hooks/use-messages";
import type { EditableMessage } from "@/features/settings/types";
import { replaceMessage } from "@/features/settings/utils/message";

/** Writes for one message. Errors are thrown to the caller, which shows them on its card. */
export function useMessageActions(key: string) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const run = useCallback(
    async (write: () => Promise<EditableMessage>): Promise<EditableMessage> => {
      try {
        const updated = await write();
        // The response is the full message, so no refetch. Updating from the current list keeps
        // another card's save that finished in the meantime.
        await mutate<EditableMessage[]>(
          MESSAGES_KEY,
          (list) => (list ? replaceMessage(list, updated) : list),
          { revalidate: false },
        );
        return updated;
      } catch (error) {
        if (accessProblem(error) === "unauthorized") router.replace("/sign-in");
        throw error;
      }
    },
    [mutate, router],
  );

  const save = useCallback((text: string) => run(() => saveMessage(key, text)), [key, run]);
  const reset = useCallback(() => run(() => resetMessage(key)), [key, run]);

  return { save, reset };
}

export type MessageActions = ReturnType<typeof useMessageActions>;
