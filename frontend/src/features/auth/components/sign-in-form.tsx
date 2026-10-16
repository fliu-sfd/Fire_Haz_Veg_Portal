"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";
import { authErrorMessage, signIn } from "@/features/auth/api";

export function SignInForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      const account = await signIn({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        remember_me: formData.get("remember_me") === "on",
      });
      router.replace(account.role === "resident" ? "/homeowner" : "/dashboard");
    } catch (error) {
      setSubmitError(authErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TextField
        id="sign-in-email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
      />

      <PasswordField
        id="sign-in-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
      />

      <CheckboxField
        id="remember-session"
        name="remember_me"
        label="Keep me signed in on this device"
      />

      {submitError ? (
        <FormAlert variant="error" title="Sign in failed">
          {submitError}
        </FormAlert>
      ) : null}

      <Button disabled={isSubmitting} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 text-base">
        {isSubmitting ? "Signing in…" : "Sign in securely"}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <p className="text-center text-xs leading-5 text-city-dark">
        Homeowners and authorized staff use the same secure sign-in.
      </p>
    </form>
  );
}
