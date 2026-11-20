// The same rules the backend applies (check_password_strength and
// check_password_not_personal in app/schemas/validators.py).
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PersonalInfo = { email: string; fullName: string };

export type PasswordRuleId = "length" | "upper" | "lower" | "number" | "special" | "personal";

export type PasswordRuleResult = { id: PasswordRuleId; label: string; met: boolean };

const hasUpper = (value: string) => /\p{Lu}/u.test(value);
const hasLower = (value: string) => /\p{Ll}/u.test(value);
const hasDigit = (value: string) => /\p{Nd}/u.test(value);
const hasSpecial = (value: string) => /[^\p{L}\p{N}\s]/u.test(value);
const charCount = (value: string) => [...value].length;

/** The email's local part and each name word, trimmed of ' . - and kept when 3+ letters. */
function personalParts({ email, fullName }: PersonalInfo): string[] {
  return [email.split("@")[0], ...fullName.trim().split(/\s+/)]
    .map((part) => part.replace(/^['.-]+|['.-]+$/g, "").toLowerCase())
    .filter((part) => charCount(part) >= 3);
}

export function containsPersonalInfo(password: string, personal: PersonalInfo): boolean {
  const lowered = password.toLowerCase();
  return personalParts(personal).some((part) => lowered.includes(part));
}

const RULES: { id: PasswordRuleId; label: string; test: (password: string, personal: PersonalInfo) => boolean }[] = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => charCount(p) >= PASSWORD_MIN_LENGTH },
  { id: "upper", label: "An upper case letter", test: hasUpper },
  { id: "lower", label: "A lower case letter", test: hasLower },
  { id: "number", label: "A number", test: hasDigit },
  { id: "special", label: "A special character, like ! # or &", test: hasSpecial },
  {
    id: "personal",
    label: "Does not contain your name or email",
    test: (p, personal) => p.length > 0 && !containsPersonalInfo(p, personal),
  },
];

/** One line per rule for the live checklist. An empty password meets none of them. */
export function passwordRuleResults(password: string, personal: PersonalInfo): PasswordRuleResult[] {
  return RULES.map(({ id, label, test }) => ({ id, label, met: test(password, personal) }));
}

export function validateCurrentPassword(value: string): string | undefined {
  if (!value) return "Enter your current password.";
  if (charCount(value) > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  return undefined;
}

/** Checks in the backend's order, so the message matches what the server would say. */
export function validateNewPassword(password: string, personal: PersonalInfo, current?: string): string | undefined {
  if (!password) return "Enter a new password.";
  const length = charCount(password);
  if (length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (password !== password.trim()) return "Password must not start or end with a space.";
  if (!hasUpper(password)) return "Password must contain an upper case letter.";
  if (!hasLower(password)) return "Password must contain a lower case letter.";
  if (!hasDigit(password)) return "Password must contain a number.";
  if (!hasSpecial(password)) return "Password must contain a special character.";
  if (current && password === current) return "Choose a password that is different from your current one.";
  if (containsPersonalInfo(password, personal)) return "Password must not contain your name or email.";
  return undefined;
}

export function validateConfirm(newPassword: string, confirm: string): string | undefined {
  if (!confirm) return "Confirm your new password.";
  if (confirm !== newPassword) return "Passwords do not match.";
  return undefined;
}
