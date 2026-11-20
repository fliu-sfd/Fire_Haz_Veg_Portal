import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { linkAsset, unlinkAsset, updateUser } from "@/features/admin/api";
import { userDetailKey } from "@/features/admin/hooks/use-user-detail";
import type { AdminUserDetail, UserUpdateInput } from "@/features/admin/types";

function isUsersListKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === "admin/users";
}

/** Writes for one user. Errors are thrown to the caller, which decides where to show them. */
export function useUserActions(id: string | null) {
  const { mutate } = useSWRConfig();

  const apply = useCallback(
    async (detail: AdminUserDetail) => {
      // Every write returns the full detail, so the panel needs no second request.
      await mutate(userDetailKey(detail.id), detail, { revalidate: false });
      // Any cached page of the table may show this user; refetch them in the background.
      void mutate(isUsersListKey);
      return detail;
    },
    [mutate],
  );

  const requireId = useCallback(() => {
    if (!id) throw new Error("No user is selected.");
    return id;
  }, [id]);

  const save = useCallback(
    async (patch: UserUpdateInput) => apply(await updateUser(requireId(), patch)),
    [apply, requireId],
  );
  const link = useCallback(
    async (assetId: string) => apply(await linkAsset(requireId(), assetId)),
    [apply, requireId],
  );
  const unlink = useCallback(
    async (assetId: string) => apply(await unlinkAsset(requireId(), assetId)),
    [apply, requireId],
  );

  return { save, link, unlink };
}
