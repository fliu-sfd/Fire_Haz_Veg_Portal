"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { splitAssetIds } from "@/features/admin/utils/format";

function AssetId({ id }: { id: string }) {
  return (
    <span className="rounded border border-city-light bg-city-gray px-1.5 py-0.5 font-mono text-xs text-city-dark">
      {id}
    </span>
  );
}

export function AssetIdList({ ids }: { ids: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (ids.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        <span aria-hidden="true">None</span>
        <span className="sr-only">No asset IDs</span>
      </span>
    );
  }

  const { shown, hidden } = splitAssetIds(ids);
  const overflowLabel = `${hidden.length} more asset ${hidden.length === 1 ? "ID" : "IDs"}`;

  return (
    <div className="flex max-w-xs flex-wrap items-center gap-1">
      {(isExpanded ? ids : shown).map((id) => (
        <AssetId key={id} id={id} />
      ))}
      {hidden.length > 0 && !isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-expanded={false}
              aria-label={`Show ${overflowLabel}`}
              onClick={() => setIsExpanded(true)}
              className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-civic-blue hover:bg-denim/15"
            >
              +{hidden.length}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 font-mono">{ids.join(", ")}</TooltipContent>
        </Tooltip>
      ) : null}
      {hidden.length > 0 && isExpanded ? (
        <button
          type="button"
          aria-expanded
          aria-label={`Hide ${overflowLabel}`}
          onClick={() => setIsExpanded(false)}
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-civic-blue hover:bg-accent"
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
