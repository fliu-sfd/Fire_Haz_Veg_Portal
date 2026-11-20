"use client";

import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";

type CopyStatus = "idle" | "copied" | "failed";

const STATUS_TEXT: Record<CopyStatus, string> = { idle: "", copied: "Link copied", failed: "Copy failed" };

/** Copies the page URL, which already holds the filters and this hazard's asset ID. */
export function CopyLinkButton() {
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={async () => setStatus((await copyText(window.location.href)) ? "copied" : "failed")}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-white px-3 text-xs font-semibold text-civic-blue hover:bg-accent"
      >
        {status === "copied" ? <Check aria-hidden="true" className="size-3.5" /> : <Link2 aria-hidden="true" className="size-3.5" />}
        Copy link
      </button>
      <span role="status" aria-live="polite" className={status === "failed" ? "text-xs font-semibold text-fire-red" : "text-xs text-city-dark"}>
        {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
