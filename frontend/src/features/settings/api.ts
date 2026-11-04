import type { EditableMessage } from "@/features/settings/types";
import { apiRequest } from "@/lib/api/client";
import { ResponseFormatError } from "@/lib/api/errors";
import { isCount, isOptionalDate, isRecord } from "@/lib/api/guards";

const INVALID_MESSAGE = "The settings service returned an invalid message.";

export function parseMessage(data: unknown): EditableMessage {
  if (
    !isRecord(data) ||
    typeof data.key !== "string" ||
    typeof data.label !== "string" ||
    typeof data.description !== "string" ||
    typeof data.message !== "string" ||
    typeof data.default_message !== "string" ||
    typeof data.is_default !== "boolean" ||
    !isCount(data.min_length) ||
    !isCount(data.max_length) ||
    !isCount(data.max_lines) ||
    !isOptionalDate(data.updated_at) ||
    (data.updated_by_name !== null && typeof data.updated_by_name !== "string")
  ) {
    throw new ResponseFormatError(INVALID_MESSAGE);
  }
  return {
    key: data.key,
    label: data.label,
    description: data.description,
    message: data.message,
    defaultMessage: data.default_message,
    isDefault: data.is_default,
    minLength: data.min_length,
    maxLength: data.max_length,
    maxLines: data.max_lines,
    updatedAt: data.updated_at,
    updatedByName: data.updated_by_name,
  };
}

export function parseMessageList(data: unknown): EditableMessage[] {
  if (!isRecord(data) || !Array.isArray(data.items)) throw new ResponseFormatError(INVALID_MESSAGE);
  return data.items.map(parseMessage);
}

function messagePath(key: string): string {
  return `/admin/settings/messages/${encodeURIComponent(key)}`;
}

export async function listMessages(): Promise<EditableMessage[]> {
  return parseMessageList(await apiRequest<unknown>("/admin/settings/messages"));
}

export async function saveMessage(key: string, message: string): Promise<EditableMessage> {
  return parseMessage(await apiRequest<unknown>(messagePath(key), {
    method: "PUT",
    body: JSON.stringify({ message }),
  }));
}

export async function resetMessage(key: string): Promise<EditableMessage> {
  return parseMessage(await apiRequest<unknown>(messagePath(key), { method: "DELETE" }));
}
