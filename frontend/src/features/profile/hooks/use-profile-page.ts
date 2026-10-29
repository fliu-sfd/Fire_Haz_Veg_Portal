import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useMyProperties } from "@/features/auth/hooks/use-my-properties";
import { usePasswordForm } from "@/features/profile/hooks/use-password-form";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useProfileActions } from "@/features/profile/hooks/use-profile-actions";
import { useProfileForm } from "@/features/profile/hooks/use-profile-form";
import { accountFacts, joinedLabel } from "@/features/profile/utils/display";

/** Everything the profile page shows, for any signed-in role. The API decides whose data it is. */
export function useProfilePage() {
  const router = useRouter();
  const { profile, errorMessage, isUnauthorized, isLoading, isRetrying, retry } = useProfile();
  const actions = useProfileActions();
  const details = useProfileForm(profile, actions.saveDetails);
  const personal = useMemo(
    () => (profile ? { email: profile.email, fullName: profile.fullName } : undefined),
    [profile],
  );
  const password = usePasswordForm(personal, actions.changePassword);
  // Only homeowners have linked properties; staff never send the request.
  const properties = useMyProperties(profile?.role === "resident" ? profile.id : null);

  useEffect(() => {
    if (isUnauthorized) router.replace("/sign-in");
  }, [isUnauthorized, router]);

  if (!profile) {
    return {
      status: errorMessage ? ("error" as const) : ("loading" as const),
      loadError: errorMessage,
      isLoading,
      isRetrying,
      retry,
    };
  }

  return {
    status: "ready" as const,
    header: { fullName: profile.fullName, role: profile.role, joined: joinedLabel(profile.createdAt) },
    email: profile.email,
    details,
    password,
    properties:
      profile.role === "resident"
        ? {
            items: properties.properties,
            errorMessage: properties.errorMessage,
            isLoading: properties.isLoading,
            isRetrying: properties.isValidating && Boolean(properties.errorMessage),
            retry: properties.refresh,
          }
        : null,
    department: profile.role === "firefighter" ? profile.firefighter : null,
    accountFacts: accountFacts(profile),
  };
}

export type ProfilePageModel = ReturnType<typeof useProfilePage>;
