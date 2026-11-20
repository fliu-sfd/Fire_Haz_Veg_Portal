import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { addMyProperty, removeMyProperty, type PropertySummary } from "@/features/auth/api";
import { CURRENT_ACCOUNT_KEY } from "@/features/auth/hooks/use-current-account";
import { myPropertiesKey } from "@/features/auth/hooks/use-my-properties";
import { propertyErrorMessage, type PropertyError } from "@/features/auth/utils/properties";

type PropertyAction = "add" | "remove";

export type PropertyActionError = PropertyError & { action: PropertyAction };

/** Each action resolves to the updated list, or null when it failed and `error` is set. */
export function usePropertyActions(accountId: string) {
  const { mutate } = useSWRConfig();
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<PropertyActionError | null>(null);

  const run = useCallback(
    async (action: PropertyAction, request: () => Promise<PropertySummary[]>) => {
      if (saving.current) return null;
      saving.current = true;
      setIsSaving(true);
      setError(null);
      try {
        const properties = await request();
        await mutate(myPropertiesKey(accountId), properties, { revalidate: false });
        // propertyIds on the account changed too
        void mutate(CURRENT_ACCOUNT_KEY);
        return properties;
      } catch (caught) {
        setError({ action, ...propertyErrorMessage(caught) });
        return null;
      } finally {
        saving.current = false;
        setIsSaving(false);
      }
    },
    [accountId, mutate],
  );

  const add = useCallback((assetId: string) => run("add", () => addMyProperty(assetId)), [run]);
  const remove = useCallback((assetId: string) => run("remove", () => removeMyProperty(assetId)), [run]);
  const clearError = useCallback(() => setError(null), []);

  return { add, remove, isSaving, error, clearError };
}
