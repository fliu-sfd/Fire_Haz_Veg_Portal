"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import { FirefighterFields } from "@/features/admin/components/firefighter-fields";
import { RoleBadge } from "@/features/admin/components/role-badge";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { UserAccessFields } from "@/features/admin/components/user-access-fields";
import { UserDetailsFields } from "@/features/admin/components/user-details-fields";
import type { UserEditFormModel } from "@/features/admin/hooks/use-user-edit-form";
import type { AdminUserDetail } from "@/features/admin/types";
import { formatDate, formatTimestamp, initials } from "@/features/admin/utils/format";
import type { Confirmation } from "@/features/admin/utils/user-form";

type UserEditSheetProps = {
  open: boolean;
  user: AdminUserDetail | undefined;
  isLoading: boolean;
  loadError: string | undefined;
  isRetrying: boolean;
  isSelf: boolean;
  form: UserEditFormModel;
  /** Linked properties, shown for residents. */
  linkedAssets: ReactNode;
  discardConfirmation: Confirmation | null;
  onRetry: () => void;
  /** Escape, the close button, Cancel and clicks outside all land here. */
  onRequestClose: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
  /** Where focus goes when the panel closes, usually the row that opened it. */
  onCloseAutoFocus: (event: Event) => void;
};

function PanelSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full bg-city-light" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 bg-city-light" />
          <Skeleton className="h-4 w-24 bg-city-light" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24 bg-city-light" />
          <Skeleton className="h-12 w-full bg-city-light" />
        </div>
      ))}
    </div>
  );
}

function LoadError({ message, isRetrying, onRetry }: { message: string; isRetrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent">
        <AlertTriangle aria-hidden="true" className="size-6 text-fire-red" />
      </div>
      <p className="mt-4 text-lg font-semibold text-charcoal">We could not load this user</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      <Button className="mt-5" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

function AccountInfo({ user }: { user: AdminUserDetail }) {
  return (
    <section aria-labelledby="user-edit-account-info">
      <h3 id="user-edit-account-info" className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">
        Account info
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-semibold text-charcoal">Joined</dt>
        <dd className="text-city-dark">
          <time dateTime={user.createdAt} title={formatTimestamp(user.createdAt)}>
            {formatDate(user.createdAt)}
          </time>
        </dd>
        <dt className="font-semibold text-charcoal">Last sign-in</dt>
        <dd className="text-city-dark">
          {user.lastLoginAt ? (
            <time dateTime={user.lastLoginAt}>{formatTimestamp(user.lastLoginAt)}</time>
          ) : (
            "Never"
          )}
        </dd>
        <dt className="font-semibold text-charcoal">Email verified</dt>
        <dd className="text-city-dark">{user.emailVerified ? "Yes" : "No"}</dd>
      </dl>
    </section>
  );
}

export function UserEditSheet({
  open,
  user,
  isLoading,
  loadError,
  isRetrying,
  isSelf,
  form,
  linkedAssets,
  discardConfirmation,
  onRetry,
  onRequestClose,
  onDiscard,
  onKeepEditing,
  onCloseAutoFocus,
}: UserEditSheetProps) {
  const values = form.values;
  const ready = user && values && !loadError;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onRequestClose())}>
      <SheetContent
        side="right"
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-full gap-0 bg-white sm:max-w-lg"
      >
        <SheetHeader className="border-b border-city-light px-6 py-5 pr-12">
          {user ? (
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-civic-blue"
              >
                {initials(user.fullName)}
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl text-charcoal">{user.fullName}</SheetTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <RoleBadge role={user.role} />
                  <StatusBadge isActive={user.isActive} />
                </div>
              </div>
            </div>
          ) : (
            <SheetTitle className="text-xl text-charcoal">Edit user</SheetTitle>
          )}
          <SheetDescription className="sr-only">Edit this user&apos;s details, access, and linked properties.</SheetDescription>
        </SheetHeader>

        {loadError ? (
          <LoadError message={loadError} isRetrying={isRetrying} onRetry={onRetry} />
        ) : isLoading || !ready ? (
          <>
            <PanelSkeleton />
            <p role="status" className="sr-only">Loading user…</p>
          </>
        ) : (
          <form
            noValidate
            aria-label={`Edit ${user.fullName}`}
            onSubmit={(event) => {
              event.preventDefault();
              form.submit();
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
              {form.formError ? <FormAlert variant="error" title="The change was not saved">{form.formError}</FormAlert> : null}

              <UserDetailsFields
                values={values}
                errors={form.errors}
                disabled={form.isSaving}
                onChange={form.setField}
                onBlur={form.blurField}
              />

              <UserAccessFields
                role={values.role}
                isActive={values.isActive}
                isSelf={isSelf}
                disabled={form.isSaving}
                onRoleChange={(role) => form.setField("role", role)}
                onActiveChange={(isActive) => form.setField("isActive", isActive)}
              />

              {form.showFirefighterFields ? (
                <FirefighterFields
                  values={values}
                  errors={form.errors}
                  disabled={form.isSaving}
                  onChange={form.setField}
                  onBlur={form.blurField}
                />
              ) : null}

              {user.role === "resident" ? linkedAssets : null}

              <AccountInfo user={user} />
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-city-light bg-white px-6 py-4">
              <p role="status" aria-live="polite" className="mr-auto text-sm font-semibold text-success-dark">
                {form.isSaved ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    Saved
                  </span>
                ) : null}
              </p>
              <Button variant="secondary" onClick={onRequestClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.isDirty || form.isSaving}>
                {form.isSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}

        <ConfirmDialog confirmation={form.confirmation} onConfirm={form.confirm} onCancel={form.cancelConfirm} />
        <ConfirmDialog
          confirmation={discardConfirmation}
          onConfirm={onDiscard}
          onCancel={onKeepEditing}
          cancelLabel="Keep editing"
        />
      </SheetContent>
    </Sheet>
  );
}
