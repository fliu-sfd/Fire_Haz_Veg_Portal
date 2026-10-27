import { TextField } from "@/components/ui/text-field";
import { userFieldId } from "@/features/admin/hooks/use-user-edit-form";
import type { UserFormErrors, UserFormField, UserFormValues } from "@/features/admin/utils/user-form";

type UserDetailsFieldsProps = {
  values: Pick<UserFormValues, "fullName" | "email" | "phone">;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: "fullName" | "email" | "phone", value: string) => void;
  onBlur: (field: UserFormField) => void;
};

export function UserDetailsFields({ values, errors, disabled, onChange, onBlur }: UserDetailsFieldsProps) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <legend className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">Details</legend>
      <TextField
        id={userFieldId("fullName")}
        label="Full name"
        autoComplete="off"
        maxLength={120}
        value={values.fullName}
        error={errors.fullName}
        onChange={(event) => onChange("fullName", event.target.value)}
        onBlur={() => onBlur("fullName")}
      />
      <TextField
        id={userFieldId("email")}
        type="email"
        inputMode="email"
        label="Email"
        autoComplete="off"
        maxLength={254}
        hint="They will need to sign in with the new email."
        value={values.email}
        error={errors.email}
        onChange={(event) => onChange("email", event.target.value)}
        onBlur={() => onBlur("email")}
      />
      <TextField
        id={userFieldId("phone")}
        type="tel"
        inputMode="tel"
        label="Phone"
        optional
        autoComplete="off"
        maxLength={20}
        hint="Leave blank to remove the phone number."
        value={values.phone}
        error={errors.phone}
        onChange={(event) => onChange("phone", event.target.value)}
        onBlur={() => onBlur("phone")}
      />
    </fieldset>
  );
}
