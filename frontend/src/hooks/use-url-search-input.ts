import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * A search box whose debounced value is written to the URL by `commit`.
 * `urlValue` is the search currently in the URL; `normalize` must match how `commit` cleans text.
 */
export function useUrlSearchInput(urlValue: string, commit: (value: string) => void, normalize: (value: string) => string) {
  const [input, setInput] = useState(urlValue);
  const debounced = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const lastSent = useRef(debounced);

  // When the URL changes from outside the input (Back, Forward, a shared link), show it in
  // the box. A change that matches what the debounce just sent is our own, so keep
  // whatever the user has typed since.
  const [synced, setSynced] = useState(urlValue);
  if (urlValue !== synced) {
    setSynced(urlValue);
    if (urlValue !== normalize(debounced)) setInput(urlValue);
  }

  // Only a new debounced value may write to the URL; reacting to `commit` changing
  // identity would re-apply a stale search after Back.
  useEffect(() => {
    if (debounced === lastSent.current) return;
    lastSent.current = debounced;
    commit(debounced);
  }, [debounced, commit]);

  return { input, setInput, clear: () => setInput("") };
}
