import type { UserRole } from "@/features/auth/api";

export type UserSortField = "full_name" | "email" | "role" | "asset_ids" | "created_at";

export type SortOrder = "asc" | "desc";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  assetIds: string[];
  createdAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type AdminUserList = {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

export type UsersQuery = {
  q: string;
  role: UserRole | null;
  sort: UserSortField;
  order: SortOrder;
  limit: number;
  page: number;
};

export type FirefighterDetails = {
  employeeId: string;
  stationCode: string | null;
};

export type AdminUserDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  assetIds: string[];
  /** Kept after a firefighter changes role, so it is reused if they return. */
  firefighter: FirefighterDetails | null;
};

/** Only the fields present are sent. `phone: null` clears the phone. */
export type UserUpdateInput = Partial<{
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  firefighter: FirefighterDetails;
}>;
