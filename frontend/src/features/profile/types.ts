import type { UserRole } from "@/features/auth/api";

export type FirefighterDetails = {
  employeeId: string;
  stationCode: string | null;
};

/** The signed-in user's own account, from GET /me/profile. */
export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Sorted; empty for staff. */
  assetIds: string[];
  /** Only set for firefighters. */
  firefighter: FirefighterDetails | null;
};

/** Only the fields present are sent. `phone: null` clears the phone. */
export type ProfileUpdateInput = Partial<{
  fullName: string;
  phone: string | null;
}>;

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
};
