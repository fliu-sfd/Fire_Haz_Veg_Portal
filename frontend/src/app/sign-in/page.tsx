import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Vegetation Assessment portal.",
};

export default function SignInPage() {
  return (
    <AuthPageShell
      eyebrow="Secure account access"
      title="Welcome back"
      description="Use your account email and password to continue to your homeowner portal or staff workspace."
      panelTitle="Pick up where you left off."
      panelDescription="One secure sign-in connects homeowners and fire-prevention staff to the right tools for their role."
      highlights={[
        "Return to active property assessments",
        "Keep updates connected to the correct account",
        "Continue securely on any supported device",
      ]}
      footer={
        <p>
          New homeowner?{" "}
          <Link href="/sign-up/homeowner" className="font-bold text-denim underline-offset-4 hover:underline">Create an account</Link>
        </p>
      }
    >
      <SignInForm />
    </AuthPageShell>
  );
}
