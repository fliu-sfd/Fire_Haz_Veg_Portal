import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  const style = variant === "primary"
    ? "bg-green-800 text-white hover:bg-green-900"
    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100";
  return <button type={type} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`} {...props} />;
}
