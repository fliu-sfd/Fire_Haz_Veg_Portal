import { useCallback, useEffect, useState } from "react";
import type { AdminUserDetail, UserUpdateInput } from "@/features/admin/types";
import { editError } from "@/features/admin/utils/errors";
import {
  buildPatch,
  initialFormValues,
  saveConfirmation,
  validateForm,
  type Confirmation,
  type UserFormErrors,
  type UserFormField,
  type UserFormValues,
} from "@/features/admin/utils/user-form";

const SAVED_NOTICE_MS = 4000;

type FormState = {
  userId: string;
  /** The saved values; the form is dirty when its values differ from these. */
  baseline: UserFormValues;
  values: UserFormValues;
  errors: UserFormErrors;
  formError?: string;
};

type Status = "idle" | "saving" | "saved";

export function userFieldId(field: UserFormField): string {
  return `user-edit-${field}`;
}

function fresh(user: AdminUserDetail): FormState {
  const values = initialFormValues(user);
  return { userId: user.id, baseline: values, values, errors: {} };
}

function focusField(field: UserFormField) {
  document.getElementById(userFieldId(field))?.focus();
}

/** Form state for the open user. It starts over whenever a different user loads. */
export function useUserEditForm(
  user: AdminUserDetail | undefined,
  save: (patch: UserUpdateInput) => Promise<AdminUserDetail>,
) {
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, setPending] = useState<{ patch: UserUpdateInput; confirmation: Confirmation } | null>(null);

  // Adjusting state while rendering (not in an effect) avoids one render with the old user.
  if (user && form?.userId !== user.id) {
    setForm(fresh(user));
    setStatus("idle");
    setPending(null);
  }

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), SAVED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const current = form && user && form.userId === user.id ? form : null;
  const isDirty = current ? Object.keys(buildPatch(current.baseline, current.values)).length > 0 : false;

  const setField = useCallback(<K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) => {
    setForm((state) => {
      if (!state) return state;
      const errors = { ...state.errors };
      if (field in errors) delete errors[field as UserFormField];
      return { ...state, values: { ...state.values, [field]: value }, errors };
    });
    setStatus((value) => (value === "saved" ? "idle" : value));
  }, []);

  const blurField = useCallback((field: UserFormField) => {
    setForm((state) => {
      if (!state) return state;
      // A field the form will not send (firefighter fields of a non-firefighter) shows no error.
      const error = validateForm(state.baseline, state.values)[field];
      const errors = { ...state.errors };
      if (error) errors[field] = error;
      else delete errors[field];
      return { ...state, errors };
    });
  }, []);

  const send = useCallback(
    async (changes: UserUpdateInput) => {
      setStatus("saving");
      setForm((state) => (state ? { ...state, formError: undefined } : state));
      try {
        const saved = await save(changes);
        setForm(fresh(saved));
        setStatus("saved");
      } catch (error) {
        const { field, message } = editError(error);
        setStatus("idle");
        if (field && field !== "assetId") {
          setForm((state) => (state ? { ...state, errors: { ...state.errors, [field]: message } } : state));
          focusField(field);
        } else {
          setForm((state) => (state ? { ...state, formError: message } : state));
        }
      }
    },
    [save],
  );

  const submit = useCallback(() => {
    if (!current || !user || status === "saving") return;
    const errors = validateForm(current.baseline, current.values);
    const invalid = Object.keys(errors) as UserFormField[];
    if (invalid.length > 0) {
      setForm({ ...current, errors: { ...current.errors, ...errors } });
      focusField(invalid[0]);
      return;
    }
    const patch = buildPatch(current.baseline, current.values);
    if (Object.keys(patch).length === 0) return;
    const confirmation = saveConfirmation(user.fullName, current.baseline, patch);
    if (confirmation) setPending({ patch, confirmation });
    else void send(patch);
  }, [current, user, status, send]);

  const confirm = useCallback(() => {
    if (!pending) return;
    setPending(null);
    void send(pending.patch);
  }, [pending, send]);

  const reset = useCallback(() => {
    setForm((state) => (state ? { ...state, values: state.baseline, errors: {}, formError: undefined } : state));
    setStatus("idle");
    setPending(null);
  }, []);

  return {
    values: current?.values,
    errors: current?.errors ?? {},
    formError: current?.formError,
    isDirty,
    isSaving: status === "saving",
    isSaved: status === "saved" && !isDirty,
    showFirefighterFields: current?.values.role === "firefighter",
    confirmation: pending?.confirmation ?? null,
    setField,
    blurField,
    submit,
    confirm,
    cancelConfirm: () => setPending(null),
    reset,
  };
}

export type UserEditFormModel = ReturnType<typeof useUserEditForm>;
