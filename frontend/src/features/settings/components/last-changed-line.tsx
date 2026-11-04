import type { EditableMessage } from "@/features/settings/types";
import { lastChangedText } from "@/features/settings/utils/message";

type LastChangedLineProps = {
  message: Pick<EditableMessage, "isDefault" | "updatedAt" | "updatedByName">;
};

export function LastChangedLine({ message }: LastChangedLineProps) {
  return <p className="text-sm text-city-dark">{lastChangedText(message)}</p>;
}
