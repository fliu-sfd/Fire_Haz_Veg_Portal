import { useCallback, useState } from "react";
import { useAddPropertyForm } from "@/features/auth/hooks/use-add-property-form";
import { useMyProperties } from "@/features/auth/hooks/use-my-properties";
import { usePropertyActions } from "@/features/auth/hooks/use-property-actions";

/** View model for the homeowner page: the property list and the changes made to it. */
export function useHomeownerProperties(accountId: string) {
  const list = useMyProperties(accountId);
  const actions = usePropertyActions(accountId);
  const { add: addProperty } = actions;
  const [notice, setNotice] = useState("");

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

  return { ...list, form, notice, isSaving: actions.isSaving };
}
