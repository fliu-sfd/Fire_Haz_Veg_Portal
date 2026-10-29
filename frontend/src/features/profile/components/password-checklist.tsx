import { Check, Circle } from "lucide-react";
import type { PasswordRuleResult } from "@/features/profile/utils/password";
import { cn } from "@/lib/utils";

export function PasswordChecklist({ id, rules }: { id: string; rules: PasswordRuleResult[] }) {
  return (
    <ul id={id} aria-label="Password rules" className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn("flex items-center gap-2", rule.met ? "font-semibold text-success-dark" : "text-city-dark")}
        >
          {rule.met ? (
            <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <Circle aria-hidden="true" className="size-4 shrink-0 text-silver-spur" />
          )}
          <span>
            <span className="sr-only">{rule.met ? "Done: " : "Not yet: "}</span>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
