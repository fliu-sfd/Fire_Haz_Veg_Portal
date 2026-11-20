import { formatDate, formatTimestamp } from "@/features/admin/utils/format";
import { ROLE_LABELS } from "@/features/admin/utils/user-form";
import type { Profile } from "@/features/profile/types";

// Dates read as they do for crews and homeowners in Scottsdale.
const TIME_ZONE = "America/Phoenix";

export type AccountFact = { label: string; value: string; dateTime?: string };

export function joinedLabel(createdAt: string, timeZone = TIME_ZONE): string {
  return `Joined ${formatDate(createdAt, timeZone)}`;
}

export function accountFacts(profile: Profile, timeZone = TIME_ZONE): AccountFact[] {
  return [
    { label: "Role", value: ROLE_LABELS[profile.role] },
    { label: "Email verified", value: profile.emailVerified ? "Yes" : "No" },
    profile.lastLoginAt
      ? { label: "Last sign-in", value: formatTimestamp(profile.lastLoginAt, timeZone), dateTime: profile.lastLoginAt }
      : { label: "Last sign-in", value: "Never" },
    { label: "Member since", value: formatDate(profile.createdAt, timeZone), dateTime: profile.createdAt },
  ];
}
