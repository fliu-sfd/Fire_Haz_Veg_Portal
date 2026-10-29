import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { changePassword as postPasswordChange, updateProfile } from "@/features/profile/api";
import { PROFILE_KEY } from "@/features/profile/hooks/use-profile";
import type { PasswordChangeInput, Profile, ProfileUpdateInput } from "@/features/profile/types";
import { isUnauthorized } from "@/features/profile/utils/errors";

/** Writes for the signed-in user. Errors are thrown to the caller, which decides where to show them. */
export function useProfileActions() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const run = useCallback(
    async <T,>(write: () => Promise<T>): Promise<T> => {
      try {
        return await write();
      } catch (error) {
        // The session ended in another tab or by a password change elsewhere.
        if (isUnauthorized(error)) router.replace("/sign-in");
        throw error;
      }
    },
    [router],
  );

  const saveDetails = useCallback(
    (patch: ProfileUpdateInput) =>
      run(async (): Promise<Profile> => {
        const profile = await updateProfile(patch);
        // The response is the full profile, so the page needs no second request.
        await mutate(PROFILE_KEY, profile, { revalidate: false });
        return profile;
      }),
    [mutate, run],
  );

  const changePassword = useCallback((input: PasswordChangeInput) => run(() => postPasswordChange(input)), [run]);

  return { saveDetails, changePassword };
}
