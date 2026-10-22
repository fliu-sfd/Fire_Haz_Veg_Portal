import { useCallback, useMemo, useSyncExternalStore } from "react";

const CHANGE_EVENT = "local-storage-change";

// Writes made in this tab win over storage, so the value still updates when
// storage is blocked (private mode, disabled cookies) or full.
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string) {
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Storage may throw when unavailable or full; the in-memory copy is enough.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

function subscribe(key: string, onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== key) return;
    memory.delete(key);
    onChange();
  }
  function handleLocalChange(event: Event) {
    if ((event as CustomEvent<string>).detail === key) onChange();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

type SetValue<T> = (next: T | ((current: T) => T)) => void;

/**
 * Persists JSON in localStorage. The server and hydration render use
 * `defaultValue`; the stored value applies right after. `parse` returns
 * undefined for anything invalid, which falls back to `defaultValue`.
 * Pass a stable `defaultValue` and `parse` (module-level), or `value` changes every render.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T | undefined = parseJson as (raw: string) => T | undefined,
): [T, SetValue<T>] {
  const raw = useSyncExternalStore(
    useCallback((onChange: () => void) => subscribe(key, onChange), [key]),
    () => readRaw(key),
    () => null,
  );

  const value = useMemo(
    () => (raw === null ? defaultValue : parse(raw) ?? defaultValue),
    [raw, defaultValue, parse],
  );

  const setValue = useCallback<SetValue<T>>(
    (next) => {
      const stored = readRaw(key);
      const current = stored === null ? defaultValue : parse(stored) ?? defaultValue;
      const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      writeRaw(key, JSON.stringify(resolved));
    },
    [key, defaultValue, parse],
  );

  return [value, setValue];
}
