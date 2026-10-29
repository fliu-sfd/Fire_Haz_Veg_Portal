import type { Profile, ProfileUpdateInput } from "@/features/profile/types";
import { normalizeFullName, normalizePhone, validateFullName, validatePhone } from "@/lib/validation/person";

/** What the details form holds. Text fields keep what the user typed until they are sent. */
export type ProfileFormValues = {
  fullName: string;
  phone: string;
};

export type ProfileFormField = keyof ProfileFormValues;

export type ProfileFormErrors = Partial<Record<ProfileFormField, string>>;

export function initialProfileValues(profile: Profile): ProfileFormValues {
  return { fullName: profile.fullName, phone: profile.phone ?? "" };
}

/** The fields to send: only what changed, compared after the same cleanup the backend does. */
export function buildPatch(initial: ProfileFormValues, current: ProfileFormValues): ProfileUpdateInput {
  const patch: ProfileUpdateInput = {};
  if (normalizeFullName(current.fullName) !== normalizeFullName(initial.fullName)) {
    patch.fullName = normalizeFullName(current.fullName);
  }
  if (normalizePhone(current.phone) !== normalizePhone(initial.phone)) {
    patch.phone = normalizePhone(current.phone);
  }
  return patch;
}

export function isDirty(initial: ProfileFormValues, current: ProfileFormValues): boolean {
  return Object.keys(buildPatch(initial, current)).length > 0;
}

export function validateProfileField(field: ProfileFormField, values: ProfileFormValues): string | undefined {
  return field === "fullName" ? validateFullName(values.fullName) : validatePhone(values.phone);
}

export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  for (const field of ["fullName", "phone"] as const) {
    const error = validateProfileField(field, values);
    if (error) errors[field] = error;
  }
  return errors;
}
