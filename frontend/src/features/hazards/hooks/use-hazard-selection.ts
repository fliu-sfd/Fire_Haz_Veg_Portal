import { useCallback, useState } from "react";
import type { Hazard } from "@/features/hazards/types";
import { missingSelection, type SelectionSource, type SelectRequest } from "@/features/hazards/utils/selection";

type Options = {
  /** The selected asset from the URL. */
  asset: string | null;
  hazards: readonly Hazard[];
  isSettled: boolean;
  setAsset: (asset: string | null) => void;
};

export function useHazardSelection({ asset, hazards, isSettled, setAsset }: Options) {
  const [request, setRequest] = useState<SelectRequest | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const missing = missingSelection(asset, hazards, isSettled);

  const select = useCallback(
    (assetId: string, source: SelectionSource, options: { focusMarker?: boolean } = {}) => {
      setAsset(assetId);
      if (source === "list") {
        setRequest((current) => ({
          assetId,
          seq: (current?.seq ?? 0) + 1,
          flyTo: true,
          focusMarker: options.focusMarker ?? false,
        }));
      }
    },
    [setAsset],
  );

  // The map reports every popup it opens or closes; a closed popup clears the selection.
  const onMapSelect = useCallback(
    (assetId: string | null) => (assetId ? select(assetId, "map") : setAsset(null)),
    [select, setAsset],
  );

  return {
    selectedAssetId: missing ? null : asset,
    request,
    select,
    onMapSelect,
    missingAssetId: missing && missing !== dismissed ? missing : null,
    dismissNotice: () => setDismissed(missing),
  };
}
