import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  allColumns,
  canHideColumn,
  defaultVisibleColumns,
  parseStoredColumns,
  toggleColumn,
  type ColumnConfig,
} from "@/features/admin/utils/columns";

/** Display-only preference: it never changes the request or the query state. */
export function useColumnVisibility<Id extends string>(columns: readonly ColumnConfig<Id>[], storageKey: string) {
  const defaults = useMemo(() => defaultVisibleColumns(columns), [columns]);
  const parse = useCallback((raw: string) => parseStoredColumns(columns, raw), [columns]);
  const [visible, setVisible] = useLocalStorage<Id[]>(storageKey, defaults, parse);

  const toggle = useCallback(
    (id: Id) => setVisible((current) => toggleColumn(columns, current, id)),
    [columns, setVisible],
  );
  const showAll = useCallback(() => setVisible(allColumns(columns)), [columns, setVisible]);
  const isVisible = useCallback((id: Id) => visible.includes(id), [visible]);
  const canHide = useCallback((id: Id) => canHideColumn(columns, visible, id), [columns, visible]);

  return { visible, toggle, showAll, isVisible, canHide };
}
