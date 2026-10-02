import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { useSuggestions } from '@/hooks/data/admin/useSuggestions';
import { TABLE_FOR_CONTENT_KIND, tableHref } from '../../table/tablePaths';
import { kindLabel } from './kindLabels';

/**
 * Facts accepted in bulk that nobody has looked at since (C29), counted
 * where the owner decides what reaches students: Publishing's kinds and the
 * edit bar's Changes. Each count links to its table, filtered to those rows
 * ("Accepted in bulk, not reviewed"), where Mark reviewed clears them.
 *
 * Read only where it is shown (the Changes popover mounts it when opened):
 * the list is every such accept, and nothing else needs it. Loaded lazily
 * by both — they are eager console code, and the suggestions client is not
 * (eagerBoundary.test.ts).
 */

/** Each kind's bulk accepts not yet marked reviewed; null until known. */
export function useBulkUnreviewed(): ReadonlyMap<string, number> | null {
  const query = useSuggestions({ unreviewed: true });
  return useMemo(() => {
    if (!query.served || !query.data) return null;
    const counts = new Map<string, number>();
    for (const row of query.data.rows) {
      if (!row.unreviewed) continue;
      const kind = row.suggestion.target.kind;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return counts;
  }, [query.served, query.data]);
}

/** Where a kind's unreviewed bulk accepts are listed: its table, filtered. */
export const bulkReviewHref = (kind: string): string | null => {
  const table = TABLE_FOR_CONTENT_KIND[kind as ContentKind];
  return table ? `${tableHref(table)}?f=bulk-unreviewed` : null;
};

/** "943 accepted in bulk, not reviewed", as a link to them. */
export const BulkUnreviewedLink = ({
  kind,
  count,
  className,
}: {
  kind: string;
  count: number;
  className?: string;
}) => {
  const href = bulkReviewHref(kind);
  const text = `${count.toLocaleString()} accepted in bulk, not reviewed`;
  return href ? (
    <Link
      to={href}
      className={
        className ??
        'text-xs text-sky-200/85 underline-offset-2 hover:text-white hover:underline'
      }
    >
      {text}
    </Link>
  ) : (
    <span className="text-xs text-white/60">{text}</span>
  );
};

/** For the Changes popover: the kinds with bulk accepts to review. */
export const BulkUnreviewedLines = () => {
  const counts = useBulkUnreviewed();
  if (!counts || counts.size === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {[...counts].map(([kind, count]) => (
        <li key={kind} className="text-xs text-white/60">
          {kindLabel(kind as ContentKind)}:{' '}
          <BulkUnreviewedLink kind={kind} count={count} />
        </li>
      ))}
    </ul>
  );
};

/** For a Publishing row: its kind's count, when there is one. */
export const BulkUnreviewedFor = ({ kind }: { kind: string }) => {
  const count = useBulkUnreviewed()?.get(kind) ?? 0;
  return count > 0 ? <BulkUnreviewedLink kind={kind} count={count} /> : null;
};
