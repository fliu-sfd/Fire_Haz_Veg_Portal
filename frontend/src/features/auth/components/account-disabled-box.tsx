"use client";

import { useEffect, useRef } from "react";

type AccountDisabledBoxProps = {
  /** Rendered as text, never as HTML. */
  message: string;
  /** Takes focus and is announced when it appears. Off in a preview, which changes as an admin types. */
  announce?: boolean;
};

/** What a disabled person sees on sign-in. The Settings preview shows this same box. */
export function AccountDisabledBox({ message, announce = false }: AccountDisabledBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announce) boxRef.current?.focus();
  }, [announce]);

  return (
    <div
      ref={boxRef}
      role={announce ? "alert" : undefined}
      tabIndex={announce ? -1 : undefined}
      className="border-l-4 border-denim bg-blue-50 p-4 text-charcoal"
    >
      <p className="font-bold">Account disabled</p>
      <p className="mt-1 whitespace-pre-line break-words text-sm leading-6">{message}</p>
    </div>
  );
}
