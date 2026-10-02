import { AdminRoutes } from '@/constants/routes';
import type { PendingEdit } from '@/hooks/data/admin/useAdminContent';
import { tableHrefForItem } from '../../table/tablePaths';
import { MIRROR_BASE } from '../mirror/mirrorPaths';

/**
 * Where a queued proposal is reviewed: somewhere that shows it against the
 * live body, with Approve and Reject.
 *
 *  - A song opens on its own page in Edit mode, where the proposal shows on
 *    the page students get.
 *  - Every other kind a table holds (events, places, artists, records,
 *    studios, labels, progressions) opens its row in the Table, whose panel
 *    has the review banner: the diff and the verdicts, over the live body.
 *  - The rest (lessons, fundamentals, artist locations) open their editor.
 */
export const reviewHref = (
  row: Pick<PendingEdit, 'kind' | 'id' | 'slug'>,
): string => {
  if (row.kind === 'song') {
    return `${MIRROR_BASE}/songs/${encodeURIComponent(row.slug)}?edit=1`;
  }
  return (
    tableHrefForItem(row.kind, row.slug) ??
    AdminRoutes.contentItem({ kind: row.kind, id: row.id })
  );
};
