import { useCallback, useRef, useState } from "react";
import { useAddPropertyForm } from "@/features/auth/hooks/use-add-property-form";
import { useMyProperties } from "@/features/auth/hooks/use-my-properties";
import { usePropertyActions } from "@/features/auth/hooks/use-property-actions";

/** View model for the homeowner page: the property list and the changes made to it. */
export function useHomeownerProperties(accountId: string) {
  const list = useMyProperties(accountId);
  const actions = usePropertyActions(accountId);
  const { add: addProperty, remove: removeProperty, clearError, isSaving } = actions;
  const [notice, setNotice] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const add = useCallback(
    async (assetId: string) => {
      setNotice("");
      const saved = await addProperty(assetId);
      if (saved) {
        const added = saved.find((property) => property.assetId.toUpperCase() === assetId);
        setNotice(`Added ${added?.assetId ?? assetId}.`);
      }
      return saved;
    },
    [addProperty],
  );

  const form = useAddPropertyForm({
    add,
    serverError: actions.error?.action === "add" ? actions.error : undefined,
    clearServerError: actions.clearError,
  });

  const { focusInput } = form;

  const requestRemove = useCallback(
    (assetId: string) => {
      returnFocusTo.current = document.activeElement;
      clearError();
      setNotice("");
      setRemovingId(assetId);
    },
    [clearError],
  );

  const confirmRemove = useCallback(async () => {
    if (!removingId) return;
    const saved = await removeProperty(removingId);
    if (saved) {
      setNotice(`Removed ${removingId}.`);
      setRemovingId(null);
    }
  }, [removeProperty, removingId]);

  const cancelRemove = useCallback(() => {
    if (isSaving) return;
    clearError();
    setRemovingId(null);
  }, [clearError, isSaving]);

  // A removed card takes its button with it, so focus then moves to the Asset ID input.
  const dialogClosed = useCallback(() => {
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target instanceof HTMLElement && target !== document.body && target.isConnected) target.focus();
    else focusInput();
  }, [focusInput]);

  return {
    ...list,
    form,
    notice,
    isSaving,
    removingId,
    removeError: actions.error?.action === "remove" ? actions.error.message : undefined,
    requestRemove,
    confirmRemove: () => void confirmRemove(),
    cancelRemove,
    dialogClosed,
  };
}
