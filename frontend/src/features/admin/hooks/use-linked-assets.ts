import { useCallback, useState } from "react";
import type { AdminUserDetail } from "@/features/admin/types";
import { editError } from "@/features/admin/utils/errors";
import { normalizeAssetId, removeAssetConfirmation, validateAssetId } from "@/features/admin/utils/user-form";

type State = {
  userId: string | null;
  input: string;
  inputError?: string;
  alert?: string;
  notice?: string;
  /** "add" while linking, or the asset id being removed. */
  busy: string | null;
  /** The asset waiting for the remove confirmation. */
  confirming: string | null;
};

const empty = (userId: string | null): State => ({ userId, input: "", busy: null, confirming: null });

/** Adding and removing a resident's asset links. Each change saves right away. */
export function useLinkedAssets(
  user: AdminUserDetail | undefined,
  link: (assetId: string) => Promise<AdminUserDetail>,
  unlink: (assetId: string) => Promise<AdminUserDetail>,
) {
  const [state, setState] = useState<State>(() => empty(null));
  if (user && state.userId !== user.id) setState(empty(user.id));

  const patch = useCallback((changes: Partial<State>) => setState((current) => ({ ...current, ...changes })), []);

  const add = useCallback(async () => {
    if (!user || state.busy) return;
    const inputError = validateAssetId(state.input);
    if (inputError) {
      patch({ inputError, notice: undefined });
      return;
    }
    const assetId = normalizeAssetId(state.input);
    if (user.assetIds.some((id) => id.toUpperCase() === assetId)) {
      patch({ input: "", inputError: undefined, notice: `${assetId} is already linked.` });
      return;
    }
    patch({ busy: "add", inputError: undefined, alert: undefined, notice: undefined });
    try {
      const saved = await link(assetId);
      const added = saved.assetIds.find((id) => id.toUpperCase() === assetId) ?? assetId;
      patch({ busy: null, input: "", notice: `Linked ${added}.` });
    } catch (error) {
      const { field, message } = editError(error);
      patch(field === "assetId" ? { busy: null, inputError: message } : { busy: null, alert: message });
    }
  }, [user, state.busy, state.input, link, patch]);

  const confirmRemove = useCallback(async () => {
    const assetId = state.confirming;
    if (!assetId) return;
    patch({ confirming: null, busy: assetId, alert: undefined, notice: undefined });
    try {
      await unlink(assetId);
      patch({ busy: null, notice: `Removed ${assetId}.` });
    } catch (error) {
      patch({ busy: null, alert: editError(error).message });
    }
  }, [state.confirming, unlink, patch]);

  return {
    assetIds: user?.assetIds ?? [],
    input: state.input,
    inputError: state.inputError,
    alert: state.alert,
    notice: state.notice,
    isAdding: state.busy === "add",
    removingAssetId: state.busy !== "add" ? state.busy : null,
    confirmation: user && state.confirming ? removeAssetConfirmation(user.fullName, state.confirming) : null,
    setInput: (input: string) => patch({ input, inputError: undefined }),
    add: () => void add(),
    requestRemove: (assetId: string) => patch({ confirming: assetId }),
    confirmRemove: () => void confirmRemove(),
    cancelRemove: () => patch({ confirming: null }),
    reset: () => setState(empty(null)),
  };
}

export type LinkedAssetsModel = ReturnType<typeof useLinkedAssets>;
