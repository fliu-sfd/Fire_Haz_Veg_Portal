import { CircleCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { PasswordField } from "@/features/auth/components/password-field";
import { PasswordChecklist } from "@/features/profile/components/password-checklist";
import { ProfileCard } from "@/features/profile/components/profile-card";
import {
  passwordFieldId,
  type PasswordFormErrors,
  type PasswordFormField,
  type PasswordFormValues,
} from "@/features/profile/hooks/use-password-form";
import { PASSWORD_MAX_LENGTH, type PasswordRuleResult } from "@/features/profile/utils/password";

type PasswordFormProps = {
  values: PasswordFormValues;
  errors: PasswordFormErrors;
  formError?: string;
  rules: PasswordRuleResult[];
  isSaving: boolean;
  isUpdated: boolean;
  onChange: (field: PasswordFormField, value: string) => void;
  onBlur: (field: PasswordFormField) => void;
  onSubmit: () => void;
};

export function PasswordForm({
  values,
  errors,
  formError,
  rules,
  isSaving,
  isUpdated,
  onChange,
  onBlur,
  onSubmit,
}: PasswordFormProps) {
  const field = (name: PasswordFormField) => ({
    id: passwordFieldId(name),
    name,
    maxLength: PASSWORD_MAX_LENGTH,
    value: values[name],
    error: errors[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value),
    onBlur: () => onBlur(name),
  });

  return (
    <ProfileCard
      id="profile-password"
      title="Password"
      description="Changing your password signs you out on every other device."
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {formError ? (
          <div className="mb-5">
            <FormAlert variant="error" title="We could not change your password">{formError}</FormAlert>
          </div>
        ) : null}
        <fieldset className="space-y-5" disabled={isSaving}>
          <legend className="sr-only">Change password</legend>
          <PasswordField {...field("currentPassword")} label="Current password" autoComplete="current-password" />
          <div>
            <PasswordField
              {...field("newPassword")}
              label="New password"
              autoComplete="new-password"
              hint="Your new password must meet every rule listed below."
            />
            <PasswordChecklist id="profile-password-rules" rules={rules} />
          </div>
          <PasswordField {...field("confirmPassword")} label="Confirm new password" autoComplete="new-password" />
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Changing password…" : "Change password"}
          </Button>
          <p role="status" aria-live="polite" className="text-sm">
            {isUpdated ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-dark">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                Password updated. Other devices have been signed out.
              </span>
            ) : null}
          </p>
        </div>
      </form>
    </ProfileCard>
  );
}
