import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { ProfileCard } from "@/features/profile/components/profile-card";
import { profileFieldId } from "@/features/profile/hooks/use-profile-form";
import type { ProfileFormErrors, ProfileFormField, ProfileFormValues } from "@/features/profile/utils/profile-form";
import { FULL_NAME_MAX_LENGTH, PHONE_MAX_LENGTH } from "@/lib/validation/person";

type PersonalDetailsFormProps = {
  values: ProfileFormValues;
  email: string;
  errors: ProfileFormErrors;
  formError?: string;
  isDirty: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onChange: (field: ProfileFormField, value: string) => void;
  onBlur: (field: ProfileFormField) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function PersonalDetailsForm({
  values,
  email,
  errors,
  formError,
  isDirty,
  isSaving,
  isSaved,
  onChange,
  onBlur,
  onSubmit,
  onReset,
}: PersonalDetailsFormProps) {
  return (
    <ProfileCard id="profile-details" title="Personal details" description="How the department can reach you.">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {formError ? (
          <div className="mb-5">
            <FormAlert variant="error" title="We could not save your details">{formError}</FormAlert>
          </div>
        ) : null}
        <fieldset className="space-y-5" disabled={isSaving}>
          <legend className="sr-only">Personal details</legend>
          <TextField
            id={profileFieldId("fullName")}
            label="Full name"
            autoComplete="name"
            maxLength={FULL_NAME_MAX_LENGTH}
            value={values.fullName}
            error={errors.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            onBlur={() => onBlur("fullName")}
          />
          <TextField
            id="profile-email"
            type="email"
            label="Email"
            autoComplete="email"
            readOnly
            value={email}
            hint="Contact an administrator to change your email."
          />
          <TextField
            id={profileFieldId("phone")}
            type="tel"
            inputMode="tel"
            label="Phone"
            optional
            autoComplete="tel"
            maxLength={PHONE_MAX_LENGTH}
            hint="Leave blank to remove your phone number."
            value={values.phone}
            error={errors.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            onBlur={() => onBlur("phone")}
          />
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="secondary" onClick={onReset} disabled={!isDirty || isSaving}>
            Reset
          </Button>
          <p role="status" aria-live="polite" className="text-sm">
            {isSaved ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-dark">
                <CircleCheck aria-hidden="true" className="size-4" />
                Saved
              </span>
            ) : isDirty ? (
              <span className="text-city-dark">You have unsaved changes</span>
            ) : null}
          </p>
        </div>
      </form>
    </ProfileCard>
  );
}
