import { useCallback, useEffect, useState } from "react";
import type { MessageActions } from "@/features/settings/hooks/use-message-actions";
import type { EditableMessage } from "@/features/settings/types";
import { messageActionError } from "@/features/settings/utils/errors";
import { normalizeMessage } from "@/features/settings/utils/message";

const SAVED_NOTICE_MS = 4000;

type Status = "idle" | "saving" | "resetting" | "saved";

export function messageFieldId(key: string): string {
  return `message-${key}`;
}

export function messageResetButtonId(key: string): string {
  return `message-${key}-reset`;
}

/** Saving disables the button that was pressed, which would drop keyboard focus out of the card. */
function keepFocusInCard(key: string) {
  const active = document.activeElement;
  if (!active || active === document.body || (active instanceof HTMLButtonElement && active.disabled)) {
    document.getElementById(messageFieldId(key))?.focus();
  }
}

/** The text box of one card. Each card has its own, so one failing does not affect the others. */
export function useMessageForm(
  message: EditableMessage,
  actions: MessageActions,
  onDirtyChange: (key: string, isDirty: boolean) => void,
) {
  const { key } = message;
  const [value, setValue] = useState(message.message);
  const [baseline, setBaseline] = useState(message.message);
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string>();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // The saved text changed underneath (a refetch). Adjusting state while rendering, not in an
  // effect, avoids one render with the old text. Unsaved typing is kept.
  if (baseline !== message.message) {
    setBaseline(message.message);
    if (normalizeMessage(value, message).text === baseline) setValue(message.message);
  }

  const normalized = normalizeMessage(value, message);
  const isDirty = normalized.text !== message.message;
  const isBusy = status === "saving" || status === "resetting";

  useEffect(() => {
    onDirtyChange(key, isDirty);
    return () => onDirtyChange(key, false);
  }, [key, isDirty, onDirtyChange]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), SAVED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const change = useCallback((next: string) => {
    setValue(next);
    setFormError(undefined);
    setStatus((current) => (current === "saved" ? "idle" : current));
  }, []);

  const submit = useCallback(async () => {
    if (isBusy || !isDirty) return;
    if (normalized.error) {
      document.getElementById(messageFieldId(key))?.focus();
      return;
    }
    setStatus("saving");
    setFormError(undefined);
    try {
      const updated = await actions.save(normalized.text);
      setValue(updated.message);
      setStatus("saved");
      keepFocusInCard(key);
    } catch (error) {
      setFormError(messageActionError(error));
      setStatus("idle");
    }
  }, [actions, isBusy, isDirty, key, normalized.error, normalized.text]);

  const requestReset = useCallback(() => {
    setFormError(undefined);
    setIsConfirmingReset(true);
  }, []);

  const cancelReset = useCallback(() => {
    if (!isBusy) setIsConfirmingReset(false);
  }, [isBusy]);

  const confirmReset = useCallback(async () => {
    if (isBusy) return;
    setStatus("resetting");
    try {
      const updated = await actions.reset();
      setValue(updated.message);
      setStatus("saved");
    } catch (error) {
      setFormError(messageActionError(error));
      setStatus("idle");
    } finally {
      // The dialog stays open until now, so focus has somewhere valid to return to.
      setIsConfirmingReset(false);
    }
  }, [actions, isBusy]);

  /** A successful reset disables the Reset button, so focus goes to the text box instead. */
  const resetDialogClosed = useCallback(() => {
    const button = document.getElementById(messageResetButtonId(key));
    if (button instanceof HTMLButtonElement && !button.disabled) button.focus();
    else document.getElementById(messageFieldId(key))?.focus();
  }, [key]);

  return {
    value,
    /** The text as it would be saved, which the preview and counter use. */
    cleanedText: normalized.text,
    length: normalized.length,
    // Saved text is always shown without complaint; errors are for what has been changed.
    error: isDirty ? normalized.error : undefined,
    formError,
    canSave: isDirty && !normalized.error && !isBusy,
    canReset: !message.isDefault && !isBusy,
    isSaving: status === "saving",
    isResetting: status === "resetting",
    isSaved: status === "saved" && !isDirty,
    isDirty,
    isConfirmingReset,
    change,
    submit,
    requestReset,
    cancelReset,
    confirmReset,
    resetDialogClosed,
  };
}

export type MessageFormModel = ReturnType<typeof useMessageForm>;
