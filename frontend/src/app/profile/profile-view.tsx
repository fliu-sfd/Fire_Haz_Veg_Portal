"use client";

import { AccountInfoCard } from "@/features/profile/components/account-info-card";
import { DepartmentDetailsCard } from "@/features/profile/components/department-details-card";
import { LinkedPropertiesCard } from "@/features/profile/components/linked-properties-card";
import { PasswordForm } from "@/features/profile/components/password-form";
import { PersonalDetailsForm } from "@/features/profile/components/personal-details-form";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { ProfileLoadError, ProfileSkeleton } from "@/features/profile/components/profile-states";
import { useProfilePage } from "@/features/profile/hooks/use-profile-page";

export function ProfileView() {
  const page = useProfilePage();

  if (page.status === "error") {
    return <ProfileLoadError message={page.loadError} isRetrying={page.isRetrying} onRetry={page.retry} />;
  }
  if (page.status === "loading") return <ProfileSkeleton />;

  const { details, password, properties, department } = page;
  // The form fills in on the render after the profile arrives.
  const values = details.values;
  if (!values) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <ProfileHeader {...page.header} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <PersonalDetailsForm
            values={values}
            email={page.email}
            errors={details.errors}
            formError={details.formError}
            isDirty={details.isDirty}
            isSaving={details.isSaving}
            isSaved={details.isSaved}
            onChange={details.setField}
            onBlur={details.blurField}
            onSubmit={() => void details.submit()}
            onReset={details.reset}
          />
          <PasswordForm
            values={password.values}
            errors={password.errors}
            formError={password.formError}
            rules={password.rules}
            isSaving={password.isSaving}
            isUpdated={password.isUpdated}
            onChange={password.setField}
            onBlur={password.blurField}
            onSubmit={() => void password.submit()}
          />
        </div>

        <div className="space-y-6">
          <AccountInfoCard facts={page.accountFacts} />
          {properties ? (
            <LinkedPropertiesCard
              items={properties.items}
              errorMessage={properties.errorMessage}
              isLoading={properties.isLoading}
              isRetrying={properties.isRetrying}
              onRetry={properties.retry}
            />
          ) : null}
          {department ? <DepartmentDetailsCard details={department.details} /> : null}
        </div>
      </div>
    </div>
  );
}
