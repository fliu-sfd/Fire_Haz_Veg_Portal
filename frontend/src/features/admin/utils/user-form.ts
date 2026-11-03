import type { Confirmation } from "@/components/ui/confirm-dialog";
import type { AdminUserDetail, UserUpdateInput } from "@/features/admin/types";
import type { UserRole } from "@/features/auth/api";
import { normalizeAssetId, validateAssetId } from "@/lib/validation/asset-id";
import {
  normalizeFullName,
  normalizePhone,
  validateFullName,
  validatePhone,
} from "@/lib/validation/person";

export type { Confirmation };
export { normalizeAssetId, normalizeFullName, normalizePhone, validateAssetId, validateFullName, validatePhone };

/** What the edit form holds. Text fields keep what the admin typed until they are sent. */
export type UserFormValues = {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
};

export type UserFormField = "fullName" | "email" | "phone";

export type UserFormErrors = Partial<Record<UserFormField, string>>;

// The same limits the backend applies (app/schemas/validators.py).
// Name and phone rules live in @/lib/validation/person, Asset ID rules in @/lib/validation/asset-id.
const EMAIL_MAX_LENGTH = 254;

// A practical check only; the backend's email validator has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLE_LABELS: Record<UserRole, string> = {
  resident: "Resident",
  admin: "Admin",
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function validateEmail(value: string): string | undefined {
  const email = normalizeEmail(value);
  if (!email) return "Enter an email address.";
  if (email.length > EMAIL_MAX_LENGTH) return `Email must be at most ${EMAIL_MAX_LENGTH} characters.`;
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address, like name@example.com.";
  return undefined;
}

export function initialFormValues(user: AdminUserDetail): UserFormValues {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    isActive: user.isActive,
  };
}

/** The fields to send: only what changed, compared after the same cleanup the backend does. */
export function buildPatch(initial: UserFormValues, current: UserFormValues): UserUpdateInput {
  const patch: UserUpdateInput = {};
  if (normalizeFullName(current.fullName) !== normalizeFullName(initial.fullName)) {
    patch.fullName = normalizeFullName(current.fullName);
  }
  if (normalizeEmail(current.email) !== normalizeEmail(initial.email)) {
    patch.email = normalizeEmail(current.email);
  }
  if (normalizePhone(current.phone) !== normalizePhone(initial.phone)) {
    patch.phone = normalizePhone(current.phone);
  }
  if (current.role !== initial.role) patch.role = current.role;
  if (current.isActive !== initial.isActive) patch.isActive = current.isActive;
  return patch;
}

export function isDirty(initial: UserFormValues, current: UserFormValues): boolean {
  return Object.keys(buildPatch(initial, current)).length > 0;
}

export function validateField(field: UserFormField, values: UserFormValues): string | undefined {
  switch (field) {
    case "fullName":
      return validateFullName(values.fullName);
    case "email":
      return validateEmail(values.email);
    case "phone":
      return validatePhone(values.phone);
  }
}

export function validateForm(values: UserFormValues): UserFormErrors {
  const fields: UserFormField[] = ["fullName", "email", "phone"];
  const errors: UserFormErrors = {};
  for (const field of fields) {
    const error = validateField(field, values);
    if (error) errors[field] = error;
  }
  return errors;
}

/** Saving a role change or turning an account off asks first. Other edits save directly. */
export function saveConfirmation(name: string, initial: UserFormValues, patch: UserUpdateInput): Confirmation | null {
  const roleChange = patch.role !== undefined ? { from: ROLE_LABELS[initial.role], to: ROLE_LABELS[patch.role] } : null;
  const disabling = patch.isActive === false;

  if (disabling) {
    return {
      title: `Disable ${name}?`,
      description:
        "They will be signed out and can't sign in until you turn the account back on." +
        (roleChange ? ` Their role also changes from ${roleChange.from} to ${roleChange.to}.` : ""),
      actionLabel: roleChange ? "Disable and change role" : "Disable account",
      destructive: true,
    };
  }
  if (roleChange) {
    return {
      title: `Change ${name} from ${roleChange.from} to ${roleChange.to}?`,
      description: "Their access changes on their next request.",
      actionLabel: "Change role",
      destructive: false,
    };
  }
  return null;
}

export function removeAssetConfirmation(name: string, assetId: string): Confirmation {
  return {
    title: `Remove ${assetId} from ${name}?`,
    description: "They will no longer see this property.",
    actionLabel: "Remove property",
    destructive: true,
  };
}

export function discardConfirmation(name: string): Confirmation {
  return {
    title: "Discard changes?",
    description: `Your edits to ${name} have not been saved.`,
    actionLabel: "Discard changes",
    destructive: true,
  };
}
