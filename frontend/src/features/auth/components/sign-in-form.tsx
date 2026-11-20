"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";
import { AccountDisabledBox } from "@/features/auth/components/account-disabled-box";
import { signIn, signInProblem, type SignInProblem } from "@/features/auth/api";

export function SignInForm() {
  const router = useRouter();
  const [problem, setProblem] = useState<SignInProblem>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // React clears currentTarget once this handler first awaits.
    const passwordInput = event.currentTarget.elements.namedItem("password");
    const formData = new FormData(event.currentTarget);
    setProblem(undefined);
    setIsSubmitting(true);
    try {
      const account = await signIn({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        remember_me: formData.get("remember_me") === "on",
      });
      router.replace(account.role === "resident" ? "/homeowner" : "/dashboard");
    } catch (error) {
      const next = signInProblem(error);
      setProblem(next);
      if (next.kind === "disabled" && passwordInput instanceof HTMLInputElement) passwordInput.value = "";
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

      {problem?.kind === "disabled" ? <AccountDisabledBox message={problem.message} announce /> : null}
      {problem?.kind === "failed" ? (
        <FormAlert variant="error" title="Sign in failed">
          {problem.message}
        </FormAlert>
      ) : null}

      <Button disabled={isSubmitting} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 text-base">
        {isSubmitting ? "Signing in…" : "Sign in securely"}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <p className="text-center text-xs leading-5 text-city-dark">
        Homeowners and administrators use the same secure sign-in.
      </p>
    </form>
  );
}
