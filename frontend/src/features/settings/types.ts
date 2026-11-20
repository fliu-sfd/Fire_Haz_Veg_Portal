/** One message an admin can edit, from GET /admin/settings/messages. */
export type EditableMessage = {
  key: string;
  label: string;
  description: string;
  message: string;
  defaultMessage: string;
  isDefault: boolean;
  minLength: number;
  maxLength: number;
  maxLines: number;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type MessageLimits = Pick<EditableMessage, "minLength" | "maxLength" | "maxLines">;
