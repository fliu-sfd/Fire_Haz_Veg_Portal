import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  const style = variant === "primary"
    ? "border border-denim bg-denim text-white hover:border-deep-blue hover:bg-deep-blue"
    : "border border-civic-blue bg-white text-civic-blue hover:bg-civic-blue hover:text-white";
  return <button type={type} className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`} {...props} />;
}
