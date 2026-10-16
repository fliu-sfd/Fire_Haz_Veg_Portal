import type { Metadata } from "next";
import Link from "next/link";
import { FormAlert } from "@/components/ui/form-alert";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";

export const metadata: Metadata = {
  title: "Department sign up",
  description: "Department account access for the Vegetation Assessment portal.",
};

export default function StaffSignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Department access"
      title="Staff accounts are managed internally"
      description="Fire personnel should use an existing department account or contact an administrator for access."
      panelTitle="Coordinate prevention work with confidence."
      panelDescription="Department accounts provide one place to review inspections, homeowner updates, and vegetation assessment progress."
      highlights={[
        "Review reported inspections across properties",
        "Track homeowner correction submissions",
        "Manage staff access with administrator approval",
      ]}
      footer={
        <p>
          Already have department access?{" "}
          <Link href="/sign-in" className="font-bold text-denim underline-offset-4 hover:underline">Sign in</Link>
        </p>
      }
    >
      <FormAlert variant="info" title="Department-managed access">
        This resident portal does not offer public staff registration.
      </FormAlert>
      <Link href="/sign-in" className="mt-6 inline-flex rounded bg-denim px-5 py-3 font-bold text-white transition-colors hover:bg-deep-blue">
        Go to staff sign in
      </Link>
    </AuthPageShell>
  );
}
