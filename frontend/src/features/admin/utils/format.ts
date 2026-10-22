export { initials } from "@/lib/format";

export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(iso));
}

export function formatTimestamp(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(iso));
}

export function splitAssetIds(ids: readonly string[], maxShown = 2): { shown: string[]; hidden: string[] } {
  return { shown: ids.slice(0, maxShown), hidden: ids.slice(maxShown) };
}

export function resultRange(offset: number, count: number, total: number): { from: number; to: number; total: number } {
  if (count === 0) return { from: 0, to: 0, total };
  return { from: offset + 1, to: offset + count, total };
}
