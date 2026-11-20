import { useCallback, useMemo, useState } from "react";
import type { PasswordChangeInput } from "@/features/profile/types";
import { profileError } from "@/features/profile/utils/errors";
import {
  passwordRuleResults,
  validateConfirm,
  validateCurrentPassword,
  validateNewPassword,
  type PersonalInfo,
} from "@/features/profile/utils/password";
import { ApiError } from "@/lib/api/client";

export type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordFormField = keyof PasswordFormValues;

export type PasswordFormErrors = Partial<Record<PasswordFormField, string>>;

type Status = "idle" | "saving" | "updated";

const EMPTY: PasswordFormValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
const FIELDS: PasswordFormField[] = ["currentPassword", "newPassword", "confirmPassword"];

export function passwordFieldId(field: PasswordFormField): string {
  return `profile-${field}`;
}

function focusField(field: PasswordFormField) {
  document.getElementById(passwordFieldId(field))?.focus();
}

function validate(field: PasswordFormField, values: PasswordFormValues, personal: PersonalInfo): string | undefined {
  switch (field) {
    case "currentPassword":
      return validateCurrentPassword(values.currentPassword);
    case "newPassword":
      return validateNewPassword(values.newPassword, personal, values.currentPassword);
    case "confirmPassword":
      return validateConfirm(values.newPassword, values.confirmPassword);
  }
}

/**
 * The change password form. Passwords live only in this component state: never in the URL,
 * storage or the SWR cache. `personal` is the saved name and email the server checks against.
 */
export function usePasswordForm(
  personal: PersonalInfo | undefined,
  changePassword: (input: PasswordChangeInput) => Promise<void>,
) {
  const [values, setValues] = useState<PasswordFormValues>(EMPTY);
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [status, setStatus] = useState<Status>("idle");
  const info = useMemo(() => personal ?? { email: "", fullName: "" }, [personal]);
  const rules = useMemo(() => passwordRuleResults(values.newPassword, info), [values.newPassword, info]);

  const setField = useCallback((field: PasswordFormField, value: string) => {
    setValues((state) => ({ ...state, [field]: value }));
    setErrors((state) => {
      const next = { ...state };
      delete next[field];
      return next;
    });
    setStatus((value) => (value === "updated" ? "idle" : value));
  }, []);

  const blurField = useCallback(
    (field: PasswordFormField) => {
      // An empty field someone tabs past shows nothing yet; submit reports it.
      if (!values[field]) return;
      setErrors((state) => {
        const next = { ...state };
        const fields: PasswordFormField[] =
          field === "newPassword" && values.confirmPassword ? ["newPassword", "confirmPassword"] : [field];
        for (const name of fields) {
          const error = validate(name, values, info);
          if (error) next[name] = error;
          else delete next[name];
        }
        return next;
      });
    },
    [values, info],
  );

  const submit = useCallback(async () => {
    if (!personal || status === "saving") return;
    const found: PasswordFormErrors = {};
    for (const field of FIELDS) {
      const error = validate(field, values, info);
      if (error) found[field] = error;
    }
    const invalid = Object.keys(found) as PasswordFormField[];
    if (invalid.length > 0) {
      setErrors(found);
      focusField(invalid[0]);
      return;
    }

    setStatus("saving");
    setFormError(undefined);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setValues(EMPTY);
      setErrors({});
      setStatus("updated");
    } catch (error) {
      const { field, message } = profileError(error);
      setStatus("idle");
      // A wrong current password (400) clears every field, so nothing typed stays around.
      if (error instanceof ApiError && error.status === 400) setValues(EMPTY);
      if (field && field !== "fullName" && field !== "phone") {
        setErrors({ [field]: message });
        focusField(field);
      } else {
        setFormError(message);
      }
    }
  }, [personal, status, values, info, changePassword]);

  return {
    values,
    errors,
    formError,
    rules,
    isSaving: status === "saving",
    isUpdated: status === "updated",
    setField,
    blurField,
    submit,
  };
}

export type PasswordFormModel = ReturnType<typeof usePasswordForm>;
