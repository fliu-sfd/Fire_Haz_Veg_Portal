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
};

export function ConfirmDialog({ confirmation, onConfirm, onCancel, cancelLabel = "Cancel" }: ConfirmDialogProps) {
  return (
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => (open ? undefined : onCancel())}>
      {confirmation ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction destructive={confirmation.destructive} onClick={onConfirm}>
              {confirmation.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
