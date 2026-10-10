import type { ReactNode } from "react";

type FormAlertProps = {
  variant: "error" | "info" | "success";
  title: string;
  children?: ReactNode;
};

const styles = {
  error: "border-fire-red bg-red-50 text-charcoal",
  info: "border-denim bg-blue-50 text-charcoal",
  success: "border-success-dark bg-lime-50 text-charcoal",
};

export function FormAlert({ variant, title, children }: FormAlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`border-l-4 p-4 ${styles[variant]}`}
    >
      <p className="font-bold">{title}</p>
      {children ? <div className="mt-1 text-sm leading-6">{children}</div> : null}
    </div>
  );
}
