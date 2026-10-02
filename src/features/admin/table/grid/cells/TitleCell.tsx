import { Sparkles } from 'lucide-react';
import { cn } from '@/components/utilities';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../../ui/ConsoleBadge';
import type { TableDef, TableRow } from '../../model/types';

/**
 * The identity cell: the row's name and the line under it, with what state
 * the row is in — a draft, a proposal waiting or sent back, archived, found
 * nowhere, or (in the working copy) held only by the repo — and how many
 * suggestions wait on it. A record marked unconfirmed is muted and italic,
 * as its chips are elsewhere.
 */

interface Badge {
  label: string;
  tone: ConsoleBadgeTone;
  title: string;
}

/** The one badge a row's state earns, most pressing first; none when published. */
export function statusBadge(
  row: Pick<TableRow, 'status' | 'editState'>,
  def: Pick<TableDef, 'contentKind'>,
  mode: 'working' | 'repo',
): Badge | null {
  if (row.status === 'archived') {
    return { label: 'Archived', tone: 'muted', title: 'Archived in the API' };
  }
  if (row.status === 'missing') {
    return {
      label: 'Missing',
      tone: 'danger',
      title: 'Something names it, but it is found nowhere',
    };
  }
  if (row.editState === 'rejected') {
    return {
      label: 'Sent back',
      tone: 'danger',
      title: 'A proposed change was sent back',
    };
  }
  if (row.status === 'pending' || row.editState === 'pending') {
    return {
      label: 'Pending review',
      tone: 'info',
      title: 'A proposed change waits for review',
    };
  }
  if (row.status === 'draft') {
    return { label: 'Draft', tone: 'warning', title: 'Not published yet' };
  }
  // In the working copy, a content row the API does not hold is the repo's;
  // in repo mode every row is, and the toolbar says so once.
  if (row.status === 'code' && def.contentKind && mode === 'working') {
    return {
      label: 'Repo',
      tone: 'muted',
      title: 'Only the repo has it: the API holds no copy yet',
    };
  }
  return null;
}

export const TitleCell = ({
  row,
  def,
  mode,
  stale,
  label,
}: {
  row: TableRow;
  def: TableDef;
  mode: 'working' | 'repo';
  /**
   * Listed though the query does not match it, and why: "No longer
   * matches" or "Sorted elsewhere" (edited this session, and held where it
   * was), "Outside this view" (the open row).
   */
  stale?: string;
  /**
   * The name a cell edit wrote, while the rows catch up with it: what the
   * record is called now, checked or not.
   */
  label?: string;
}) => {
  const badge = statusBadge(row, def, mode);
  const under = [stale, row.sublabel].filter(Boolean).join(' · ');
  const name = label ?? row.label;
  const unverified = row.unverified && label === undefined;
  return (
    <div className="flex min-w-0 flex-col justify-center">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          title={unverified ? `${name} — marked unconfirmed` : name}
          className={cn(
            'truncate text-sm',
            unverified ? 'italic text-white/55' : 'text-white/90',
          )}
        >
          {name}
          {unverified && <span className="sr-only">, unconfirmed</span>}
        </span>
        {badge && (
          <ConsoleBadge
            tone={badge.tone}
            title={badge.title}
            className="shrink-0 px-1.5 py-0 text-[10px]"
          >
            {badge.label}
          </ConsoleBadge>
        )}
        {row.suggestions > 0 && (
          <span
            title={`${row.suggestions} open suggestion${row.suggestions === 1 ? '' : 's'}`}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-400/10 px-1.5 text-[10px] tabular-nums leading-4 text-sky-300"
          >
            <Sparkles aria-hidden className="size-2.5" />
            {row.suggestions}
            <span className="sr-only"> suggestions</span>
          </span>
        )}
      </div>
      {under && (
        <p
          title={under}
          className={cn(
            'truncate text-[11px] leading-[14px]',
            stale ? 'italic text-white/50' : 'text-white/50',
          )}
        >
          {under}
        </p>
      )}
    </div>
  );
};
