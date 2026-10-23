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
