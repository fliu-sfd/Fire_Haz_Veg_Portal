"use client";

import { Loader } from "@/components/ui/loader";
import { AdminAccessRequired } from "@/features/admin/components/users-states";
import { MessageCard } from "@/features/settings/components/message-card";
import { SettingsLoadError, SettingsSkeleton } from "@/features/settings/components/settings-states";
import { useMessageActions } from "@/features/settings/hooks/use-message-actions";
import { useMessageForm } from "@/features/settings/hooks/use-message-form";
import { useSettingsPage } from "@/features/settings/hooks/use-settings-page";
import type { EditableMessage } from "@/features/settings/types";

type ConnectedMessageCardProps = {
  message: EditableMessage;
  onDirtyChange: (key: string, isDirty: boolean) => void;
};

// The list length comes from the API, so each card needs its own component to call its hooks.
function ConnectedMessageCard({ message, onDirtyChange }: ConnectedMessageCardProps) {
  const actions = useMessageActions(message.key);
  const form = useMessageForm(message, actions, onDirtyChange);
  return <MessageCard message={message} form={form} />;
}

export function SettingsView() {
  const page = useSettingsPage();

  // Render nothing admin-specific until the role check passes, so a redirect never flashes the page.
  if (page.access !== "allowed") {
    return <Loader label="Checking access…" />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight text-charcoal sm:text-4xl">Settings</h1>
        <p className="mt-2 text-city-dark">Change the wording of messages the portal shows to people.</p>
      </header>

      {page.isForbidden ? (
        <section aria-label="Settings" className="rounded-lg border border-city-light bg-white">
          <AdminAccessRequired action="change settings" />
        </section>
      ) : page.messages ? (
        page.messages.map((message) => (
          <ConnectedMessageCard key={message.key} message={message} onDirtyChange={page.reportDirty} />
        ))
      ) : page.errorMessage && !page.isLoading ? (
        <SettingsLoadError message={page.errorMessage} isRetrying={page.isRetrying} onRetry={page.retry} />
      ) : (
        <SettingsSkeleton />
      )}
    </div>
  );
}
