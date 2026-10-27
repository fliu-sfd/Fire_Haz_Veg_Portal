import { AlertTriangle, SearchX, ShieldAlert, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type StateMessageProps = {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
};

function StateMessage({ icon, title, children, action, role }: StateMessageProps) {
  return (
    <div role={role} className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-civic-blue">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-charcoal">{title}</h2>
      {children ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function NoMatchingUsers({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <StateMessage
      icon={<SearchX aria-hidden="true" className="size-6" />}
      title="No users match your filters"
      action={<Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>}
    >
      Try a different name, email, or asset ID, or choose another role or status.
    </StateMessage>
  );
}

export function NoUsers() {
  return (
    <StateMessage icon={<Users aria-hidden="true" className="size-6" />} title="No users yet">
      Accounts appear here once residents or staff sign up.
    </StateMessage>
  );
}

export function PastLastPage({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <StateMessage
      icon={<SearchX aria-hidden="true" className="size-6" />}
      title="This page is past the end of the list"
      action={<Button variant="secondary" onClick={onFirstPage}>Go to the first page</Button>}
    />
  );
}

type UsersErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export function UsersError({ message, isRetrying, onRetry }: UsersErrorProps) {
  return (
    <StateMessage
      role="alert"
      icon={<AlertTriangle aria-hidden="true" className="size-6 text-fire-red" />}
      title="We could not load users"
      action={
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      }
    >
      {message}
    </StateMessage>
  );
}

export function AdminAccessRequired() {
  return (
    <StateMessage role="alert" icon={<ShieldAlert aria-hidden="true" className="size-6" />} title="Administrator access required">
      Your account does not have permission to view users. Contact an administrator if you need access.
    </StateMessage>
  );
}
