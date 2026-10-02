import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Opening and closing a row without piling up history.
 *
 * A row opened from its table's list is one history entry on top of that
 * list, and its history state says so (`rowState`). Closing it then goes
 * back to that entry — Back after closing does not reopen the row — as long
 * as the list is still the one to show (its query unchanged since the row
 * was opened). Otherwise (a deep link, a row opened from another row, a
 * search typed while it was open) closing replaces the row's entry with the
 * list: one entry either way, never a new one.
 *
 * The grid's Esc and the panel's close both close through this, so the two
 * never disagree about where Back goes.
 */

const LIST_BEHIND = 'tableListBehind';

/** A table URL with its query spelled one way, so two spellings compare equal. */
const normalized = (url: string): string => {
  const at = url.indexOf('?');
  if (at < 0) return url;
  const query = new URLSearchParams(url.slice(at + 1)).toString();
  return query ? `${url.slice(0, at)}?${query}` : url.slice(0, at);
};

/** The history state of a row opened from the list at `listUrl`. */
export const rowState = (listUrl: string) => ({
  [LIST_BEHIND]: normalized(listUrl),
});

/** The list behind the row showing, when it was opened from one. */
export const listBehind = (state: unknown): string | undefined => {
  if (!state || typeof state !== 'object') return undefined;
  const value = (state as Record<string, unknown>)[LIST_BEHIND];
  return typeof value === 'string' ? value : undefined;
};

/** Close the open row onto the table's list at `listUrl` (see above). */
export function useCloseRow(): (listUrl: string) => void {
  const navigate = useNavigate();
  const { state } = useLocation();
  return useCallback(
    (listUrl: string) => {
      if (listBehind(state) === normalized(listUrl)) navigate(-1);
      else navigate(listUrl, { replace: true });
    },
    [navigate, state],
  );
}
