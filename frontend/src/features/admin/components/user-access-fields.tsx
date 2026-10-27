import { useId } from "react";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS } from "@/features/admin/utils/user-form";
import { USER_ROLES } from "@/features/admin/utils/query-params";
import type { UserRole } from "@/features/auth/api";

type UserAccessFieldsProps = {
  role: UserRole;
  isActive: boolean;
  /** The admin's own account: role and status are locked so they can't lock themselves out. */
  isSelf: boolean;
  disabled: boolean;
  onRoleChange: (role: UserRole) => void;
  onActiveChange: (isActive: boolean) => void;
};

export function UserAccessFields({ role, isActive, isSelf, disabled, onRoleChange, onActiveChange }: UserAccessFieldsProps) {
  const id = useId();
  const roleId = `${id}-role`;
  const activeId = `${id}-active`;
  const selfNoteId = `${id}-self`;
  const locked = disabled || isSelf;

  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-civic-blue">Access</legend>
      {isSelf ? (
        <p id={selfNoteId} className="rounded border border-city-light bg-city-gray px-3 py-2 text-sm text-city-dark">
          You can&apos;t change your own access.
        </p>
      ) : null}
      <SelectField
        id={roleId}
        label="Role"
        value={role}
        disabled={locked}
        hint={isSelf ? undefined : "Firefighter details are asked for when the role is Firefighter."}
        onChange={(event) => onRoleChange(event.target.value as UserRole)}
      >
        {USER_ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </SelectField>
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor={activeId} className="block text-sm font-semibold text-charcoal">
            Active
          </label>
          <p className="mt-1 text-sm leading-5 text-city-dark">
            {isActive ? "The account can sign in." : "The account is disabled and can't sign in."}
          </p>
        </div>
        <Switch
          id={activeId}
          checked={isActive}
          disabled={locked}
          aria-describedby={isSelf ? selfNoteId : undefined}
          onCheckedChange={onActiveChange}
          className="mt-0.5"
        />
      </div>
    </fieldset>
  );
}
