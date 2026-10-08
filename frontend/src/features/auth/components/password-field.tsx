"use client";

import { useState } from "react";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";

type PasswordFieldProps = Omit<TextFieldProps, "trailing" | "type">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex h-12 w-12 items-center justify-center rounded-r text-city-dark transition-colors hover:bg-city-light hover:text-civic-blue focus-visible:outline-offset-[-3px]"
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5.8 9 5.8a13 13 0 0 1-2.2 2.8M6.7 6.7C4.4 8.2 3 10.4 3 10.4S6.5 16 12 16c1 0 2-.2 2.8-.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 10.5S6.5 5 12 5s9 5.5 9 5.5S17.5 16 12 16s-9-5.5-9-5.5Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10.5" r="2.5" />
            </svg>
          )}
        </button>
      }
    />
  );
}
