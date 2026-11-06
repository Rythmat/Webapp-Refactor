import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

// ── A column of the Learn dashboard, in Suno Discover's layout ─────────────
// (owner, 2026-11-04: "For You", "Staff Picks", "Progress".) A card on the
// canvas: a square art tile beside the title, four rows of thumbnail, title,
// subtitle and a small meta line, and a full-width "See more" at the foot.

export interface DiscoverRow {
  id: string;
  to: string;
  thumb: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
}

/** Rows in a column: four, so the card fills to its See more. */
export const COLUMN_ROWS = 4;

export const SEE_MORE = cn(
  'flex h-10 w-full items-center justify-center rounded-full border border-white/10 text-[0.9375rem] font-medium text-white hover:bg-white/[0.06]',
  TRANSITION,
  FOCUS_RING,
);

export function DiscoverColumn({
  title,
  art,
  icon,
  rows,
  children,
  empty,
  seeMore,
}: {
  title: string;
  /** The square tile beside the title. */
  art?: ReactNode;
  /**
   * An icon instead of the tile, drawn as Home's Studio card draws its own:
   * small and white, beside the title (owner, 2026-11-05).
   */
  icon?: string;
  rows?: readonly DiscoverRow[];
  /** A body of its own instead of rows (Progress). */
  children?: ReactNode;
  /** What shows when there are no rows. */
  empty?: string;
  seeMore: { label?: string; to: string };
}) {
  const id = `learn-column-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      data-learn-column={title}
      className="flex min-w-0 flex-col gap-4 rounded-[1.25rem] bg-[#1c1c1f] p-5"
    >
      {icon ? (
        <header className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 bg-white"
            style={{
              maskImage: `url(${icon})`,
              WebkitMaskImage: `url(${icon})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <h2 id={id} className="min-w-0 text-base leading-6 text-white">
            {title}
          </h2>
        </header>
      ) : (
        <header className="flex items-center gap-4 pb-1">
          <span className="relative size-[6.5rem] shrink-0 overflow-hidden rounded-xl">
            {art}
          </span>
          <h2 id={id} className="min-w-0 text-base leading-6 text-white">
            {title}
          </h2>
        </header>
      )}
      {children ??
        (rows && rows.length > 0 ? (
          <ul className="-mx-2 flex flex-col">
            {rows.slice(0, COLUMN_ROWS).map((row) => (
              <li key={row.id}>
                <Link
                  to={row.to}
                  className={cn(
                    'flex items-center gap-3.5 rounded-xl px-2 py-2.5 hover:bg-white/[0.04]',
                    TRANSITION,
                    FOCUS_RING,
                  )}
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                    {row.thumb}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium leading-6 text-white">
                      {row.title}
                    </span>
                    {row.subtitle && (
                      <span className="truncate text-[0.9375rem] leading-5 text-white/60">
                        {row.subtitle}
                      </span>
                    )}
                    {row.meta && (
                      <span className="truncate text-[0.8125rem] leading-5 text-white/45">
                        {row.meta}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-[0.8125rem] text-white/45">
            {empty ?? 'Nothing here yet.'}
          </p>
        ))}
      <Link to={seeMore.to} className={cn(SEE_MORE, 'mt-auto')}>
        {seeMore.label ?? 'See more'}
      </Link>
    </section>
  );
}
