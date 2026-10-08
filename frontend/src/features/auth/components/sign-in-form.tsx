"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormAlert } from "@/components/ui/form-alert";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/features/auth/components/password-field";

export function SignInForm() {
  const [showConnectionNotice, setShowConnectionNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowConnectionNotice(true);
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
        name="rememberSession"
        label="Keep me signed in on this device"
      />

      {showConnectionNotice ? (
        <FormAlert variant="info" title="Secure sign-in is not connected yet">
          The page is ready for the authentication service. No credentials were sent or stored.
        </FormAlert>
      ) : null}

      <Button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 text-base">
        Sign in securely
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
