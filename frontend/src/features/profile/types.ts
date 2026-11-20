import type { UserRole } from "@/features/auth/api";

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
  /** Sorted; empty for admins. */
  assetIds: string[];
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
