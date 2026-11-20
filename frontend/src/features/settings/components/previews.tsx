import type { ReactNode } from "react";
import { AccountDisabledBox } from "@/features/auth/components/account-disabled-box";
import { previewFor } from "@/features/settings/utils/message";

type PreviewProps = { message: string };
type Preview = (props: PreviewProps) => ReactNode;

// Add an entry here when a new message needs a custom preview.
const PREVIEWS: Record<string, Preview> = {
  disabled_account_message: ({ message }) => <AccountDisabledBox message={message} />,
};

function plainPreview({ message }: PreviewProps) {
  return (
    <p className="whitespace-pre-line break-words rounded border border-city-light p-4 text-sm leading-6 text-charcoal">
      {message}
    </p>
  );
}

export function renderPreview(key: string, message: string): ReactNode {
  return previewFor<Preview>(PREVIEWS, key, plainPreview)({ message });
}
