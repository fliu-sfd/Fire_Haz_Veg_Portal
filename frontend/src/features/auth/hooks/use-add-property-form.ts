import { useCallback, useState } from "react";
import type { PropertySummary } from "@/features/auth/api";
import type { PropertyError } from "@/features/auth/utils/properties";
import { normalizeAssetId, validateAssetId } from "@/lib/validation/asset-id";

type AddPropertyFormOptions = {
  add: (assetId: string) => Promise<PropertySummary[] | null>;
  /** The latest error from adding, if any. */
  serverError: PropertyError | undefined;
  clearServerError: () => void;
};

/** What the resident typed stays as typed; it is normalized only when sent. */
export function useAddPropertyForm({ add, serverError, clearServerError }: AddPropertyFormOptions) {
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string>();
  const [focusSignal, setFocusSignal] = useState(0);

  const focusInput = useCallback(() => setFocusSignal((count) => count + 1), []);

  const submit = useCallback(async () => {
    const invalid = validateAssetId(value);
    if (invalid) {
      clearServerError();
      setInputError(invalid);
      focusInput();
      return;
    }
    setInputError(undefined);
    const saved = await add(normalizeAssetId(value));
    if (saved) setValue("");
    focusInput();
  }, [add, clearServerError, focusInput, value]);

  return {
    value,
    fieldError: inputError ?? (serverError?.field ? serverError.message : undefined),
    alert: serverError && !serverError.field ? serverError.message : undefined,
    focusSignal,
    focusInput,
    setValue: (next: string) => {
      setValue(next);
      setInputError(undefined);
      if (serverError) clearServerError();
    },
    submit: () => void submit(),
  };
}
