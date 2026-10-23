"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";
import { authErrorMessage, registerHomeowner } from "@/features/auth/api";

export function HomeownerSignUpForm() {
  const router = useRouter();
  const [passwordError, setPasswordError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmation = formData.get("password_confirmation");

    if (password !== confirmation) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordError(undefined);
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      await registerHomeowner({
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        property_address: String(formData.get("property_address") ?? ""),
        asset_id: String(formData.get("asset_id") ?? ""),
        password: String(password ?? ""),
      });
      router.replace("/homeowner");
    } catch (error) {
      setSubmitError(authErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormAlert variant="info" title="Homeowner account">
        Use the Asset ID from your door tag.
      </FormAlert>

      <TextField
        id="homeowner-full-name"
        name="full_name"
        label="Full name"
        autoComplete="name"
        required
      />

      <TextField
        id="homeowner-email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
      />

      <TextField
        id="property-address"
        name="property_address"
        label="Property address"
        optional
        minLength={5}
        maxLength={255}
        autoComplete="street-address"
      />

      <TextField
        id="asset-id"
        name="asset_id"
        label="Asset ID"
        hint="Enter the Asset ID from your door tag."
        autoComplete="off"
        spellCheck={false}
        required
      />

      <PasswordField
        id="homeowner-password"
        name="password"
        label="Create a password"
        hint="Use at least 12 characters with upper- and lowercase letters, a number, and a symbol."
        autoComplete="new-password"
        minLength={12}
        required
      />

      <PasswordField
        id="homeowner-password-confirmation"
        name="password_confirmation"
        label="Confirm password"
        autoComplete="new-password"
        minLength={12}
        error={passwordError}
        onChange={() => passwordError && setPasswordError(undefined)}
        required
      />

      {submitError ? (
        <FormAlert variant="error" title="We could not create your account">
          {submitError}
        </FormAlert>
      ) : null}

      <Button disabled={isSubmitting} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 text-base">
        {isSubmitting ? "Creating account…" : "Create homeowner account"}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <p className="text-center text-xs leading-5 text-city-dark">
        Your Asset ID must match an assessment in the City&apos;s data.
      </p>
    </form>
  );
}
