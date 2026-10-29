// Name and phone rules shared by the admin edit panel and the profile page.
// The same limits the backend applies (app/schemas/validators.py).
export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 120;
export const PHONE_MAX_LENGTH = 20;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

// Letter runs joined by space, apostrophe, hyphen or period: "Mary-Jane O'Neil", "J. R. Smith".
const NAME_PATTERN = /^\p{L}+(?:[ '.-]+\p{L}+)*\.?$/u;
const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;

export const collapseSpaces = (value: string) => value.trim().replace(/\s+/g, " ");

export const normalizeFullName = collapseSpaces;
export const normalizePhone = (value: string): string | null => collapseSpaces(value) || null;

export function validateFullName(value: string): string | undefined {
  const name = normalizeFullName(value);
  if (!name) return "Enter a full name.";
  if (name.length < FULL_NAME_MIN_LENGTH) return `Full name must be at least ${FULL_NAME_MIN_LENGTH} characters.`;
  if (name.length > FULL_NAME_MAX_LENGTH) return `Full name must be at most ${FULL_NAME_MAX_LENGTH} characters.`;
  if (!NAME_PATTERN.test(name)) return "Use only letters, spaces, apostrophes, hyphens, and periods.";
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  const phone = normalizePhone(value);
  if (phone === null) return undefined;
  if (phone.length > PHONE_MAX_LENGTH) return `Phone must be at most ${PHONE_MAX_LENGTH} characters.`;
  if (!PHONE_PATTERN.test(phone)) return "Use only digits, spaces, hyphens, parentheses, and a leading +.";
  const digits = phone.replace(/\D/g, "").length;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    return `Phone must have ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits.`;
  }
  return undefined;
}
