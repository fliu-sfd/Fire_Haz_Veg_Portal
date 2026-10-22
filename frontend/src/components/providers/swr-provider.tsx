"use client";

import type { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";
import { isRetryableError } from "@/lib/api/errors";

const MAX_RETRIES = 3;

// Global defaults for every SWR hook under the authenticated shell. Per-hook
// options (keepPreviousData, fetcher) live next to each hook.
const config: SWRConfiguration = {
  // Each cache belongs to one mounted shell, so leaving the signed-in area drops
  // the previous user's data. Never persist it to localStorage.
  provider: () => new Map(),
  // Tab switches should not cost requests; reconnect and mount still revalidate.
  revalidateOnFocus: false,
  dedupingInterval: 5_000,
  // 401, 403 and 422 will not change on a retry, so only transient failures retry.
  onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
    if (!isRetryableError(error) || retryCount > MAX_RETRIES) return;
    setTimeout(() => revalidate({ retryCount }), 1_000 * 2 ** (retryCount - 1));
  },
};

export function SWRProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={config}>{children}</SWRConfig>;
}
