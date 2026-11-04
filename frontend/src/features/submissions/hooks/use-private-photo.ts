"use client";

import { useEffect, useRef, useState } from "react";
import { getSubmissionPhoto, submissionPhotoUrl } from "../api";
import { submissionError } from "../utils";

export function usePrivatePhoto(photoId: string) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<"idle" | "copied" | "manual">("idle");
  const resource = useRef<{ url?: string; controller?: AbortController }>({});

  useEffect(() => {
    const current = resource.current;
    return () => {
      current.controller?.abort();
      if (current.url) URL.revokeObjectURL(current.url);
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(submissionPhotoUrl(photoId));
      setLinkState("copied");
    } catch {
      setLinkState("manual");
    }
  }

  async function show() {
    if (loading) return;
    setLoading(true);
    setError(undefined);
    const controller = new AbortController();
    resource.current.controller = controller;
    try {
      const blob = await getSubmissionPhoto(photoId, controller.signal);
      if (controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      resource.current.url = objectUrl;
      setUrl(objectUrl);
    } catch (cause) {
      if (!controller.signal.aborted) setError(submissionError(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return { url, error, loading, linkState, copyLink, show };
}
