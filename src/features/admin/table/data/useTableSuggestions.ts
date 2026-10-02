import { useMemo } from 'react';
import {
  OPEN_STATUSES,
  useSuggestions,
} from '@/hooks/data/admin/useSuggestions';
import type { TableSuggestions } from '../model/buildTableModel';
import type { TableDef } from '../model/types';
import { tableSuggestionsOf } from './tableSuggestions';

/**
 * A table's suggestions, for its grid (design §3.2, §8): the open ones on
 * its kind — each row's count, the ghosts in its empty fields — and the
 * bulk accepts nobody has reviewed, for the "Accepted in bulk, not reviewed"
 * filter. With them, what the decisions log holds (the download banner) and
 * each import run's calibration (bulk accept).
 *
 * Nothing on a server without suggestions, nor for a table no content kind
 * stores (a code vocabulary).
 */
export function useTableSuggestions(def: Pick<TableDef, 'contentKind'>) {
  const kind = def.contentKind;
  const open = useSuggestions(
    { kind, status: OPEN_STATUSES },
    { enabled: !!kind },
  );
  const unreviewed = useSuggestions(
    { kind, unreviewed: true },
    { enabled: !!kind },
  );
  const suggestions = useMemo<TableSuggestions | undefined>(
    () =>
      open.data
        ? tableSuggestionsOf(open.data.rows, unreviewed.data?.rows)
        : undefined,
    [open.data, unreviewed.data],
  );
  return {
    suggestions,
    /** The server serves suggestions at all. */
    served: open.served && !!kind,
    /** The open rows, for bulk accept. */
    rows: open.data?.rows,
    batches: open.data?.batches,
    /** The decisions log, counted: the download banner. */
    decisions: open.data?.decisions,
    replay: open.data?.replay ?? null,
    error: open.error ?? unreviewed.error,
    /** The first load is on its way: no counts or ghosts yet. */
    loading: open.isLoading,
    /** Ask again, after a failure. */
    retry: () => {
      void open.refetch();
      void unreviewed.refetch();
    },
  };
}

export type TableSuggestionsState = ReturnType<typeof useTableSuggestions>;
