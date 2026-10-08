"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";

export function HomeownerSignUpForm() {
  const [passwordError, setPasswordError] = useState<string>();
  const [showPrototypeNotice, setShowPrototypeNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmation = formData.get("passwordConfirmation");

    if (password !== confirmation) {
      setPasswordError("Passwords do not match.");
      setShowPrototypeNotice(false);
      return;
    }

    setPasswordError(undefined);
    setShowPrototypeNotice(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormAlert variant="info" title="Homeowner account">
        Your role is assigned automatically. Use the Property ID provided with your vegetation assessment.
      </FormAlert>

      <TextField
        id="homeowner-full-name"
        name="fullName"
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
        id="property-id"
        name="propertyId"
        label="Property ID"
        hint="Enter the ID exactly as it appears on your assessment notice."
        autoComplete="off"
        spellCheck={false}
        required
      />

      <PasswordField
        id="homeowner-password"
        name="password"
        label="Create a password"
        hint="Use at least 8 characters."
        autoComplete="new-password"
        minLength={8}
        required
      />

      <PasswordField
        id="homeowner-password-confirmation"
        name="passwordConfirmation"
        label="Confirm password"
        autoComplete="new-password"
        minLength={8}
        error={passwordError}
        onChange={() => passwordError && setPasswordError(undefined)}
        required
      />

      {showPrototypeNotice ? (
        <FormAlert variant="info" title="Registration service coming next">
          This interface is ready, but no information was submitted because the authentication API is not connected yet.
        </FormAlert>
      ) : null}

      <Button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 text-base">
        Create homeowner account
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <p className="text-center text-xs leading-5 text-city-dark">
        Your account will be connected only to the property associated with the supplied ID.
      </p>
    </form>
  );
}
