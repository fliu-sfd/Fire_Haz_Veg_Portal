"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Confirmation = {
  title: string;
  description: string;
  actionLabel: string;
  destructive: boolean;
};

type ConfirmDialogProps = {
  /** The dialog is open while this is set. */
  confirmation: Confirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  /** Shown inside the dialog, for a confirm action that failed. */
  error?: string;
  /** The confirm action is running. The button stays focusable, so focus is not lost. */
  isPending?: boolean;
  /** The caller closes the dialog, by clearing `confirmation`, once the action has finished. */
  stayOpenOnConfirm?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
};

export function ConfirmDialog({
  confirmation,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  error,
  isPending = false,
  stayOpenOnConfirm = false,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => (open ? undefined : onCancel())}>
      {confirmation ? (
        <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p role="alert" className="text-sm font-semibold text-fire-red">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel aria-disabled={isPending || undefined} className="aria-disabled:opacity-50">{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              destructive={confirmation.destructive}
              aria-disabled={isPending || undefined}
              className="aria-disabled:opacity-50"
              onClick={(event) => {
                // Radix closes the dialog on click unless the event is prevented.
                if (stayOpenOnConfirm) event.preventDefault();
                onConfirm();
              }}
            >
              {confirmation.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
