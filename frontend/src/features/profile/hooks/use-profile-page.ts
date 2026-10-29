import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { PropertySummary, UserRole } from "@/features/auth/api";
import { useMyProperties } from "@/features/auth/hooks/use-my-properties";
import { usePasswordForm, type PasswordFormModel } from "@/features/profile/hooks/use-password-form";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useProfileActions } from "@/features/profile/hooks/use-profile-actions";
import { useProfileForm, type ProfileFormModel } from "@/features/profile/hooks/use-profile-form";
import type { FirefighterDetails } from "@/features/profile/types";
import { accountFacts, joinedLabel, type AccountFact } from "@/features/profile/utils/display";

type Loading = { status: "loading" };

type LoadError = {
  status: "error";
  loadError: string;
  isRetrying: boolean;
  retry: () => void;
};

type Ready = {
  status: "ready";
  header: { fullName: string; role: UserRole; joined: string };
  email: string;
  details: ProfileFormModel;
  password: PasswordFormModel;
  /** Only for homeowners. */
  properties: {
    items: PropertySummary[] | undefined;
    errorMessage?: string;
    isLoading: boolean;
    isRetrying: boolean;
    retry: () => void;
  } | null;
  /** Only for firefighters; null inside means no details are on file. */
  department: { details: FirefighterDetails | null } | null;
  accountFacts: AccountFact[];
};

export type ProfilePageModel = Loading | LoadError | Ready;

/** Everything the profile page shows, for any signed-in role. The API decides whose data it is. */
export function useProfilePage(): ProfilePageModel {
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
    if (!errorMessage || isLoading) return { status: "loading" };
    return { status: "error", loadError: errorMessage, isRetrying, retry: () => void retry() };
  }

  return {
    status: "ready",
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
            retry: () => void properties.refresh(),
          }
        : null,
    department: profile.role === "firefighter" ? { details: profile.firefighter } : null,
    accountFacts: accountFacts(profile),
  };
}
