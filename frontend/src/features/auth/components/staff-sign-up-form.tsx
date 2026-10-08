"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";

export function StaffSignUpForm() {
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
      <FormAlert variant="info" title="Department access only">
        A department-issued access code is required. Account privileges must still be enforced by the backend before launch.
      </FormAlert>

      <TextField
        id="staff-full-name"
        name="fullName"
        label="Full name"
        autoComplete="name"
        required
      />

      <TextField
        id="staff-email"
        name="email"
        type="email"
        label="Work email address"
        hint="Use your City of Scottsdale work email."
        autoComplete="email"
        inputMode="email"
        required
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          id="station-crew"
          name="stationCrew"
          label="Station or crew"
          autoComplete="organization"
          required
        />

        <SelectField id="staff-role" name="role" label="Account role" defaultValue="" required>
          <option value="" disabled>Select a role</option>
          <option value="firefighter">Firefighter</option>
          <option value="admin">Administrator</option>
        </SelectField>
      </div>

      <TextField
        id="staff-access-code"
        name="accessCode"
        type="password"
        label="Department access code"
        hint="Enter the code provided by your department administrator."
        autoComplete="off"
        spellCheck={false}
        required
      />

      <PasswordField
        id="staff-password"
        name="password"
        label="Create a password"
        hint="Use at least 8 characters."
        autoComplete="new-password"
        minLength={8}
        required
      />

      <PasswordField
        id="staff-password-confirmation"
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
        Create department account
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <p className="text-center text-xs leading-5 text-city-dark">
        Department accounts are intended for authorized Scottsdale Fire personnel only.
      </p>
    </form>
  );
}
