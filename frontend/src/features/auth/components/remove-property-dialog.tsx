"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removePropertyConfirmation } from "@/features/auth/utils/properties";

type RemovePropertyDialogProps = {
  /** The dialog is open while this is set. */
  assetId: string | null;
  error?: string;
  isRemoving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** The dialog has closed; focus is the caller's to place. */
  onClosed: () => void;
};

export function RemovePropertyDialog({ assetId, error, isRemoving, onConfirm, onCancel, onClosed }: RemovePropertyDialogProps) {
  const confirmation = assetId ? removePropertyConfirmation(assetId) : null;
  return (
    <ConfirmDialog
      confirmation={confirmation && isRemoving ? { ...confirmation, actionLabel: "Removing…" } : confirmation}
      error={error}
      isPending={isRemoving}
      stayOpenOnConfirm
      onConfirm={onConfirm}
      onCancel={onCancel}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onClosed();
      }}
    />
  );
}
