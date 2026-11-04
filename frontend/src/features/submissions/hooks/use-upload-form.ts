"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { submitPhotos, updateSubmission } from "../api";
import type { Submission } from "../types";
import { submissionError, validatePhotos } from "../utils";

type SelectedPhoto = { file: File; url: string };

export function useUploadForm(assessmentId: string, onSubmitted: (submission: Submission) => void, editing?: Submission) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const previews = useRef<SelectedPhoto[]>([]);
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [comment, setComment] = useState(editing?.comment ?? "");
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => previews.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  function clearPhotos() {
    previews.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    previews.current = [];
    setSelected([]);
    if (input.current) input.current.value = "";
  }

  function addPhotos(files: File[]) {
    if (saving || files.length === 0) return;
    if (input.current) input.current.value = "";
    setSuccess(false);
    const message = validatePhotos([...selected.map((photo) => photo.file), ...files]);
    setError(message);
    if (message) return;
    const photos = [...selected, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    previews.current = photos;
    setSelected(photos);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(selected[index].url);
    const next = selected.filter((_, i) => i !== index);
    previews.current = next;
    setSelected(next);
    setError(undefined);
    if (input.current) input.current.value = "";
  }

  function dropPhotos(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addPhotos(Array.from(event.dataTransfer.files));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const message = editing && selected.length === 0 ? undefined : validatePhotos(selected.map((photo) => photo.file));
    setSuccess(false);
    setError(message);
    if (message) return;
    setSaving(true);
    try {
      const files = selected.map((photo) => photo.file);
      const submission = editing
        ? await updateSubmission(assessmentId, editing.id, files, comment)
        : await submitPhotos(assessmentId, files, comment);
      clearPhotos();
      setComment("");
      setSuccess(true);
      onSubmitted(submission);
    } catch (cause) {
      setError(submissionError(cause));
    } finally {
      setSaving(false);
    }
  }

  return { id, input, selected, comment, setComment, error, success, saving, dragging, setDragging, addPhotos, removePhoto, dropPhotos, submit };
}
