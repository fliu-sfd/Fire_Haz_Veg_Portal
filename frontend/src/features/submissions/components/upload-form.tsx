"use client";

import { CheckCircle2, ImagePlus, LoaderCircle, LockKeyhole, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { useUploadForm } from "../hooks/use-upload-form";
import type { Submission } from "../types";
import { MAX_COMMENT_LENGTH, MAX_PHOTOS } from "../utils";

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm({ assessmentId, onSubmitted, editing, onCancel }: {
  assessmentId: string;
  onSubmitted: (submission: Submission) => void;
  editing?: Submission;
  onCancel?: () => void;
}) {
  const { id, input, selected, comment, setComment, error, success, saving, dragging, setDragging, addPhotos, removePhoto, dropPhotos, submit } = useUploadForm(assessmentId, onSubmitted, editing);

  return (
    <form onSubmit={submit} className="min-w-0 space-y-4" aria-busy={saving} aria-labelledby={`${id}-title`}>
      <div>
        <h3 id={`${id}-title`} className="text-sm font-semibold text-charcoal">{editing ? "Edit your submission" : "Submit completion photos"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{editing ? "Update your comment or choose replacement photos before the department reviews it." : "Show the completed work for department review."}</p>
        {editing ? <p className="mt-2 rounded-md bg-city-gray p-3 text-xs leading-5 text-city-dark">{editing.photos.length} saved {editing.photos.length === 1 ? "photo" : "photos"}. Leave the picker empty to keep them. New photos replace the entire saved set.</p> : null}
      </div>
      <div>
        <input
          ref={input} id={`${id}-photos`} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple
          aria-label={editing ? "Replacement completion photos (optional)" : "Completion photos (required)"}
          disabled={saving || selected.length >= MAX_PHOTOS} aria-required={!editing}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} aria-invalid={Boolean(error)}
          onChange={(event) => addPhotos(Array.from(event.target.files ?? []))}
          className="peer sr-only"
        />
        <label
          htmlFor={`${id}-photos`}
          onDragOver={(event) => { event.preventDefault(); if (!saving) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={dropPhotos}
          className={`flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-denim peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${dragging ? "border-denim bg-blue-50" : "border-silver-spur/60 bg-city-gray/50 hover:border-denim hover:bg-blue-50/40"}`}
        >
          <ImagePlus aria-hidden="true" className="size-6 text-civic-blue" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-civic-blue">{selected.length >= MAX_PHOTOS ? "5 photos selected" : selected.length ? "Add more photos" : "Choose photos"}</span>
          <span className="text-xs text-muted-foreground">{selected.length >= MAX_PHOTOS ? "Remove a photo to choose another." : "or drag and drop them here"}</span>
        </label>
        <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-muted-foreground">1–5 JPEG or PNG photos · Up to 5 MB and 25 MP each</p>
      </div>
      {selected.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-city-dark" role="status">{selected.length} of {MAX_PHOTOS} photos selected</p>
          <ul className="space-y-2">
            {selected.map((photo, index) => (
              <li key={photo.url} className="flex min-w-0 items-center gap-3 rounded-lg border border-city-light p-2">
                {/* Browser object URLs preview local files before they are uploaded. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Selected completion photo ${index + 1}`} className="size-12 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-charcoal" title={photo.file.name}>{photo.file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{fileSize(photo.file.size)}</p>
                </div>
                <button type="button" disabled={saving} onClick={() => removePhoto(index)} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-city-gray hover:text-fire-red disabled:opacity-50" aria-label={`Remove ${photo.file.name}`}>
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <label htmlFor={`${id}-comment`} className="text-sm font-medium text-charcoal">Comment <span className="font-normal text-muted-foreground">(optional)</span></label>
          <span id={`${id}-count`} className="text-xs tabular-nums text-muted-foreground">{comment.length.toLocaleString()} / 2,000</span>
        </div>
        <textarea
          id={`${id}-comment`} value={comment} onChange={(event) => setComment(event.target.value)}
          maxLength={MAX_COMMENT_LENGTH} rows={3} disabled={saving} aria-describedby={`${id}-count`}
          className="mt-2 block w-full min-w-0 resize-y rounded-lg border border-silver-spur/60 bg-white p-3 text-base leading-6 text-charcoal placeholder:text-muted-foreground/80 focus:border-denim disabled:opacity-60 sm:text-sm"
          placeholder="Describe the work you completed."
        />
      </div>
      {error ? <div id={`${id}-error`}><FormAlert variant="error" title="Photos could not be submitted">{error}</FormAlert></div> : null}
      {success ? (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div><p className="font-semibold">Photos submitted for review</p><p className="mt-1 text-xs leading-5">Your evidence is saved. The issue stays open until the department reviews it.</p></div>
        </div>
      ) : null}
      <Button type="submit" disabled={saving || (!editing && selected.length === 0)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg">
        {saving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="size-4" />}
        {saving ? "Saving submission…" : editing ? "Save changes" : "Submit for review"}
      </Button>
      {editing ? <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="min-h-11 w-full">Cancel editing</Button> : null}
      <p className="flex items-start justify-center gap-1.5 text-xs leading-5 text-muted-foreground"><LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>Private to your property and the department.</span></p>
    </form>
  );
}
