import type { Confirmation } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/features/admin/utils/format";
import type { EditableMessage, MessageLimits } from "@/features/settings/types";

export type NormalizedMessage = {
  text: string;
  /** In code points, as the backend counts, so an emoji is one character. */
  length: number;
  /** The first rule the text breaks. */
  error?: string;
};

/** Mirrors clean_message in backend/app/schemas/validators.py. Change both together. */
export function normalizeMessage(raw: string, limits: MessageLimits): NormalizedMessage {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex -- removing these characters is the point
    .replace(/[\u0000-\u0009\u000b-\u001f]/g, "")
    .split("\n")
    .map((line) => line.replace(/ +/g, " ").replace(/^ | $/g, ""));
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
  const length = [...text].length;

  let error: string | undefined;
  if (text.split("\n").length > limits.maxLines) {
    error = `Message must be at most ${limits.maxLines} ${limits.maxLines === 1 ? "line" : "lines"}`;
  } else if (length < limits.minLength) {
    error = `Message must be at least ${limits.minLength} characters`;
  } else if (length > limits.maxLength) {
    error = `Message must be at most ${limits.maxLength} characters`;
  }
  return error ? { text, length, error } : { text, length };
}

export function validateMessage(raw: string, limits: MessageLimits): string | undefined {
  return normalizeMessage(raw, limits).error;
}

export function limitsNote({ maxLines }: MessageLimits): string {
  return `Up to ${maxLines} ${maxLines === 1 ? "line" : "lines"}. Plain text only.`;
}

/** Swaps in the saved message. The other items stay the same objects, so their cards do not change. */
export function replaceMessage(list: EditableMessage[], updated: EditableMessage): EditableMessage[] {
  return list.map((message) => (message.key === updated.key ? updated : message));
}

export function lastChangedText(
  message: Pick<EditableMessage, "isDefault" | "updatedAt" | "updatedByName">,
  timeZone?: string,
): string {
  if (message.isDefault || !message.updatedAt) return "Using the default message.";
  const date = formatDate(message.updatedAt, timeZone);
  // The name is null once that admin's account has been removed.
  return message.updatedByName
    ? `Last changed by ${message.updatedByName} on ${date}.`
    : `Last changed on ${date}.`;
}

/** Object.hasOwn, so a key such as "constructor" cannot pick up something inherited. */
export function previewFor<T>(previews: Record<string, T>, key: string, fallback: T): T {
  return Object.hasOwn(previews, key) ? previews[key] : fallback;
}

export const RESET_CONFIRMATION: Confirmation = {
  title: "Reset this message to the default?",
  description: "People will see the default text again. The saved text is not kept.",
  actionLabel: "Reset to default",
  destructive: true,
};
