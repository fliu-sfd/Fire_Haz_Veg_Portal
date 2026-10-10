import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { StaffSignUpForm } from "@/features/auth/components/staff-sign-up-form";

export const metadata: Metadata = {
  title: "Department sign up",
  description: "Create an authorized department account for the Vegetation Assessment portal.",
};

export default function StaffSignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Department registration"
      title="Create a staff account"
      description="Register for firefighter or administrator access using your work email and department-issued access code."
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
      <StaffSignUpForm />
    </AuthPageShell>
  );
}
