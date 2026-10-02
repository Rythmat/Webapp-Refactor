import { Skeleton } from '@/components/ui/skeleton';
import { categoryOf, type TableId } from './tableIds';

/**
 * What shows while a table is on its way: the page's code loading, then the
 * Atlas being read and built. Shaped like the table it stands in for — the
 * title line, the controls, a header and rows at the grid's height — so the
 * page does not jump when the rows arrive.
 *
 * Light on purpose: the Table's layout shows it while the page's own chunk
 * loads, so it imports nothing but the ids.
 */

/** Rows drawn, enough to fill a laptop screen below the controls. */
const ROWS = 12;

/** Column widths, roughly a title and a few connection columns. */
const CELLS = ['w-56', 'w-40', 'w-48', 'w-32', 'w-44'] as const;

export const TableSkeleton = ({
  table,
  label = 'Building the table…',
}: {
  /** The table showing, for its title; none while the URL is being read. */
  table?: TableId;
  /** What is happening, for the title line and screen readers. */
  label?: string;
}) => (
  <div
    role="status"
    aria-label={label}
    className="flex min-h-0 min-w-0 flex-1 flex-col"
  >
    <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.06] px-6 pb-3 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {table ? (
          <h1 className="text-2xl leading-tight tracking-[-0.01em] text-white">
            {categoryOf(table).label}
          </h1>
        ) : (
          <Skeleton className="h-7 w-32 bg-white/[0.06]" />
        )}
        <p className="text-sm text-white/45">{label}</p>
      </div>
      <div aria-hidden className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full max-w-xs rounded-full bg-white/[0.05]" />
        <Skeleton className="h-8 w-40 rounded-full bg-white/[0.05]" />
        <Skeleton className="h-8 w-24 rounded-full bg-white/[0.05]" />
      </div>
    </div>
    <div aria-hidden className="min-h-0 flex-1 overflow-hidden">
      <div className="flex h-9 items-center gap-6 border-b border-white/[0.08] px-3">
        {CELLS.map((width) => (
          <Skeleton key={width} className={`h-2.5 ${width} bg-white/[0.06]`} />
        ))}
      </div>
      {Array.from({ length: ROWS }, (_, row) => (
        <div
          key={row}
          className="flex h-11 items-center gap-6 border-b border-white/[0.04] px-3"
          // Fading down the page, so it reads as loading, not as rows.
          style={{ opacity: 1 - row / (ROWS + 2) }}
        >
          {CELLS.map((width) => (
            <Skeleton key={width} className={`h-3 ${width} bg-white/[0.04]`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);
