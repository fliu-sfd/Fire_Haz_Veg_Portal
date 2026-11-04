import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { TextareaField } from "@/components/ui/textarea-field";
import { LastChangedLine } from "@/features/settings/components/last-changed-line";
import { renderPreview } from "@/features/settings/components/previews";
import {
  messageFieldId,
  messageResetButtonId,
  type MessageFormModel,
} from "@/features/settings/hooks/use-message-form";
import type { EditableMessage } from "@/features/settings/types";
import { limitsNote, RESET_CONFIRMATION } from "@/features/settings/utils/message";

type MessageCardProps = {
  message: EditableMessage;
  form: MessageFormModel;
};

/** One editable message. Everything specific to it comes from the API, so any message fits. */
export function MessageCard({ message, form }: MessageCardProps) {
  const headingId = `${messageFieldId(message.key)}-heading`;
  const previewId = `${messageFieldId(message.key)}-preview`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-city-light bg-white p-6 shadow-[0_12px_32px_rgba(26,35,40,0.08)] sm:p-7"
    >
      <h2 id={headingId} className="text-xl font-medium text-charcoal">{message.label}</h2>
      <p className="mt-1 text-sm leading-6 text-city-dark">{message.description}</p>

      <form
        noValidate
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        {form.formError ? (
          <FormAlert variant="error" title="We could not save this message">{form.formError}</FormAlert>
        ) : null}

        <TextareaField
          id={messageFieldId(message.key)}
          label="Message"
          rows={message.maxLines + 1}
          // Read-only, not disabled, so keyboard focus stays in the box during a save.
          readOnly={form.isSaving || form.isResetting}
          value={form.value}
          hint={limitsNote(message)}
          counter={`${form.length} of ${message.maxLength}`}
          error={form.error}
          onChange={(event) => form.change(event.target.value)}
        />

        <div>
          <h3 id={previewId} className="text-sm font-semibold text-charcoal">Preview</h3>
          <div aria-labelledby={previewId} role="group" className="mt-2">
            {renderPreview(message.key, form.cleanedText)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!form.canSave}>
            {form.isSaving ? "Saving…" : "Save message"}
          </Button>
          <Button
            id={messageResetButtonId(message.key)}
            variant="secondary"
            disabled={!form.canReset}
            onClick={form.requestReset}
          >
            Reset to default
          </Button>
          <p role="status" aria-live="polite" className="text-sm">
            {form.isSaved ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-dark">
                <CircleCheck aria-hidden="true" className="size-4" />
                Saved
              </span>
            ) : form.isDirty ? (
              <span className="text-city-dark">You have unsaved changes</span>
            ) : null}
          </p>
        </div>

        <LastChangedLine message={message} />
      </form>

      <ConfirmDialog
        confirmation={
          form.isConfirmingReset
            ? { ...RESET_CONFIRMATION, actionLabel: form.isResetting ? "Resetting…" : RESET_CONFIRMATION.actionLabel }
            : null
        }
        isPending={form.isResetting}
        stayOpenOnConfirm
        onConfirm={() => void form.confirmReset()}
        onCancel={form.cancelReset}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          form.resetDialogClosed();
        }}
      />
    </section>
  );
}
