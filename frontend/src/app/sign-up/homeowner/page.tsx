import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { HomeownerSignUpForm } from "@/features/auth/components/homeowner-sign-up-form";

export const metadata: Metadata = {
  title: "Homeowner sign up",
  description: "Create a homeowner account for the Vegetation Assessment portal.",
};

export default function HomeownerSignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Homeowner registration"
      title="Create your property account"
      description="Use the Property ID from your assessment notice to securely connect your account to the correct property."
      panelTitle="Your property work, all in one place."
      panelDescription="Create an account to understand the vegetation hazards identified during inspection and share progress with the fire-prevention team."
      highlights={[
        "Review hazard details and inspection notes",
        "Upload photos after corrective work",
        "Follow assessment progress through resolution",
      ]}
      footer={
        <p>
          Already registered?{" "}
          <Link href="/sign-in" className="font-bold text-denim underline-offset-4 hover:underline">Sign in</Link>
        </p>
      }
    >
      <HomeownerSignUpForm />
    </AuthPageShell>
  );
}
