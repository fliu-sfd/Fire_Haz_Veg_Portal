import type { HazardSort, HazardsQuery } from "@/features/hazards/types";
import { isRecord } from "@/lib/api/guards";
import { hazardsPageStateToSearchParams, parseHazardsPageState } from "@/features/hazards/utils/query-params";

export const VIEWS_STORAGE_KEY = "admin.hazards.views.v1";
export const MAX_VIEWS = 10;
export const VIEW_NAME_MAX_LENGTH = 40;

/**
 * Stored as the same params the page URL uses, so loading a view runs every value
 * through the URL parser and anything unknown falls back to a default. Filters and
 * sort only: never hazard data or anything about a person.
 */
export type StoredView = { name: string; params: string };

export type SavedView = { name: string; query: HazardsQuery; sort: HazardSort };

export type ViewNameProblem = "required" | "too_long" | null;

export function normalizeViewName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function viewNameProblem(name: string): ViewNameProblem {
  const normalized = normalizeViewName(name);
  if (!normalized) return "required";
  return normalized.length > VIEW_NAME_MAX_LENGTH ? "too_long" : null;
}

function sameName(a: string, b: string): boolean {
  return normalizeViewName(a).toLowerCase() === normalizeViewName(b).toLowerCase();
}

function viewParams(query: HazardsQuery, sort: HazardSort): string {
  return hazardsPageStateToSearchParams({ query, sort, asset: null }).toString();
}

/** Keeps valid entries only (first copy of a name wins) and at most MAX_VIEWS. */
export function parseStoredViews(raw: string): StoredView[] | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const views: StoredView[] = [];
  for (const entry of value) {
    if (views.length === MAX_VIEWS) break;
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.params !== "string") continue;
    if (viewNameProblem(entry.name) || views.some((view) => sameName(view.name, entry.name as string))) continue;
    const { query, sort } = parseHazardsPageState(new URLSearchParams(entry.params));
    views.push({ name: normalizeViewName(entry.name), params: viewParams(query, sort) });
  }
  return views;
}

export function toSavedView(view: StoredView): SavedView {
  const { query, sort } = parseHazardsPageState(new URLSearchParams(view.params));
  return { name: view.name, query, sort };
}

export function canSaveView(views: readonly StoredView[], name: string): boolean {
  return views.length < MAX_VIEWS || views.some((view) => sameName(view.name, name));
}

/** Saving under an existing name replaces that view in place. Past the limit nothing changes. */
export function upsertView(
  views: readonly StoredView[],
  name: string,
  query: HazardsQuery,
  sort: HazardSort,
): StoredView[] {
  if (viewNameProblem(name) || !canSaveView(views, name)) return [...views];
  const next: StoredView = { name: normalizeViewName(name), params: viewParams(query, sort) };
  const index = views.findIndex((view) => sameName(view.name, name));
  return index === -1 ? [...views, next] : views.map((view, i) => (i === index ? next : view));
}

export function removeView(views: readonly StoredView[], name: string): StoredView[] {
  return views.filter((view) => !sameName(view.name, name));
}
