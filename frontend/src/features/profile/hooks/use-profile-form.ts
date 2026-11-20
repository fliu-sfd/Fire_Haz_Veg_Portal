import { useCallback, useEffect, useState } from "react";
import type { Profile, ProfileUpdateInput } from "@/features/profile/types";
import { profileError } from "@/features/profile/utils/errors";
import {
  buildPatch,
  initialProfileValues,
  validateProfileField,
  validateProfileForm,
  type ProfileFormErrors,
  type ProfileFormField,
  type ProfileFormValues,
} from "@/features/profile/utils/profile-form";

const SAVED_NOTICE_MS = 4000;

type FormState = {
  profileId: string;
  /** The saved values; the form is dirty when its values differ from these. */
  baseline: ProfileFormValues;
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  formError?: string;
};

type Status = "idle" | "saving" | "saved";

export function profileFieldId(field: ProfileFormField): string {
  return `profile-${field}`;
}

function fresh(profile: Profile): FormState {
  const values = initialProfileValues(profile);
  return { profileId: profile.id, baseline: values, values, errors: {} };
}

function focusField(field: ProfileFormField) {
  document.getElementById(profileFieldId(field))?.focus();
}

/** The personal details form. It starts over when a different profile loads. */
export function useProfileForm(
  profile: Profile | undefined,
  save: (patch: ProfileUpdateInput) => Promise<Profile>,
) {
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  // Adjusting state while rendering (not in an effect) avoids one render with the old profile.
  if (profile && form?.profileId !== profile.id) {
    setForm(fresh(profile));
    setStatus("idle");
  }

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), SAVED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const current = form && profile && form.profileId === profile.id ? form : null;
  const isDirty = current ? Object.keys(buildPatch(current.baseline, current.values)).length > 0 : false;

  // The browser's own leave prompt, only while there are unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const setField = useCallback((field: ProfileFormField, value: string) => {
    setForm((state) => {
      if (!state) return state;
      const errors = { ...state.errors };
      delete errors[field];
      return { ...state, values: { ...state.values, [field]: value }, errors };
    });
    setStatus((value) => (value === "saved" ? "idle" : value));
  }, []);

  const blurField = useCallback((field: ProfileFormField) => {
    setForm((state) => {
      if (!state) return state;
      const error = validateProfileField(field, state.values);
      const errors = { ...state.errors };
      if (error) errors[field] = error;
      else delete errors[field];
      return { ...state, errors };
    });
  }, []);

  const submit = useCallback(async () => {
    if (!current || status === "saving") return;
    const errors = validateProfileForm(current.values);
    const invalid = Object.keys(errors) as ProfileFormField[];
    if (invalid.length > 0) {
      setForm({ ...current, errors: { ...current.errors, ...errors } });
      focusField(invalid[0]);
      return;
    }
    const patch = buildPatch(current.baseline, current.values);
    if (Object.keys(patch).length === 0) return;

    setStatus("saving");
    setForm({ ...current, formError: undefined });
    try {
      setForm(fresh(await save(patch)));
      setStatus("saved");
    } catch (error) {
      const { field, message } = profileError(error);
      setStatus("idle");
      if (field === "fullName" || field === "phone") {
        setForm((state) => (state ? { ...state, errors: { ...state.errors, [field]: message } } : state));
        focusField(field);
      } else {
        setForm((state) => (state ? { ...state, formError: message } : state));
      }
    }
  }, [current, status, save]);

  const reset = useCallback(() => {
    setForm((state) => (state ? { ...state, values: state.baseline, errors: {}, formError: undefined } : state));
    setStatus("idle");
  }, []);

  return {
    values: current?.values,
    errors: current?.errors ?? {},
    formError: current?.formError,
    isDirty,
    isSaving: status === "saving",
    isSaved: status === "saved" && !isDirty,
    setField,
    blurField,
    submit,
    reset,
  };
}

export type ProfileFormModel = ReturnType<typeof useProfileForm>;
