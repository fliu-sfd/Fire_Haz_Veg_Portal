import type { UserSortField } from "@/features/admin/types";

export type ColumnConfig<Id extends string = string> = {
  id: Id;
  label: string;
  /** Present when the column can be sorted by the server. */
  sortField?: UserSortField;
  defaultVisible: boolean;
  /** Locked columns can never be hidden. */
  locked?: boolean;
};

export type UserColumnId = "name" | "email" | "role" | "assetIds" | "createdAt";

export const USER_COLUMNS: readonly ColumnConfig<UserColumnId>[] = [
  // Name identifies the row, so it stays visible.
  { id: "name", label: "Name", sortField: "full_name", defaultVisible: true, locked: true },
  { id: "email", label: "Email", sortField: "email", defaultVisible: true },
  { id: "role", label: "Role", sortField: "role", defaultVisible: true },
  { id: "assetIds", label: "Asset IDs", sortField: "asset_ids", defaultVisible: true },
  { id: "createdAt", label: "Created", sortField: "created_at", defaultVisible: true },
];

export const USER_COLUMNS_STORAGE_KEY = "admin.users.columns.v1";

function inConfigOrder<Id extends string>(columns: readonly ColumnConfig<Id>[], ids: Iterable<Id>): Id[] {
  const set = new Set(ids);
  return columns.filter((column) => set.has(column.id) || column.locked).map((column) => column.id);
}

export function defaultVisibleColumns<Id extends string>(columns: readonly ColumnConfig<Id>[]): Id[] {
  return inConfigOrder(columns, columns.filter((column) => column.defaultVisible).map((column) => column.id));
}

export function allColumns<Id extends string>(columns: readonly ColumnConfig<Id>[]): Id[] {
  return columns.map((column) => column.id);
}

export function canHideColumn<Id extends string>(
  columns: readonly ColumnConfig<Id>[],
  visible: readonly Id[],
  id: Id,
): boolean {
  const column = columns.find((candidate) => candidate.id === id);
  return Boolean(column && !column.locked && visible.includes(id) && visible.length > 1);
}

export function toggleColumn<Id extends string>(
  columns: readonly ColumnConfig<Id>[],
  visible: readonly Id[],
  id: Id,
): Id[] {
  if (visible.includes(id)) {
    return canHideColumn(columns, visible, id) ? visible.filter((candidate) => candidate !== id) : [...visible];
  }
  if (!columns.some((column) => column.id === id)) return [...visible];
  return inConfigOrder(columns, [...visible, id]);
}

/** Reads a stored id list. Returns undefined for anything unusable, so callers fall back to the default. */
export function parseStoredColumns<Id extends string>(
  columns: readonly ColumnConfig<Id>[],
  raw: string,
): Id[] | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) return undefined;
  const known = new Set<string>(columns.map((column) => column.id));
  const ids = value.filter((id): id is Id => known.has(id));
  return ids.length > 0 ? inConfigOrder(columns, ids) : undefined;
}

/** The label of the sort column when it is hidden, so the UI can explain the row order. */
export function hiddenSortLabel<Id extends string>(
  columns: readonly ColumnConfig<Id>[],
  visible: readonly Id[],
  sort: UserSortField,
): string | null {
  const column = columns.find((candidate) => candidate.sortField === sort);
  return column && !visible.includes(column.id) ? column.label : null;
}
