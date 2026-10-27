import { TextField } from "@/components/ui/text-field";
import { userFieldId } from "@/features/admin/hooks/use-user-edit-form";
import type { UserFormErrors, UserFormField, UserFormValues } from "@/features/admin/utils/user-form";

type FirefighterFieldsProps = {
  values: Pick<UserFormValues, "employeeId" | "stationCode">;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: "employeeId" | "stationCode", value: string) => void;
  onBlur: (field: UserFormField) => void;
};

export function FirefighterFields({ values, errors, disabled, onChange, onBlur }: FirefighterFieldsProps) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <legend className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">Firefighter details</legend>
      <TextField
        id={userFieldId("employeeId")}
        label="Employee ID"
        autoComplete="off"
        maxLength={32}
        inputClassName="uppercase"
        value={values.employeeId}
        error={errors.employeeId}
        onChange={(event) => onChange("employeeId", event.target.value)}
        onBlur={() => onBlur("employeeId")}
      />
      <TextField
        id={userFieldId("stationCode")}
        label="Station code"
        optional
        autoComplete="off"
        maxLength={16}
        placeholder="616C"
        inputClassName="uppercase"
        value={values.stationCode}
        error={errors.stationCode}
        onChange={(event) => onChange("stationCode", event.target.value)}
        onBlur={() => onBlur("stationCode")}
      />
    </fieldset>
  );
}
