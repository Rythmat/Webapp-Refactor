import { yearSpan } from '../../model/aggregate';
import type { CellValue } from '../../model/types';
import { EmptyNote } from './EmptyNote';

/**
 * A years cell: the span, "1954–2019", over a small decade histogram — one
 * bar per decade from the first to the last, gaps included, so a spread
 * reads at a glance. The histogram takes the cell's width (up to 120 px);
 * a long span packs its decades into hairline bars, touching once there is
 * no room for a gap. Bars are a neutral grey: the height is the meaning,
 * colour would add nothing (the console's colour rule, ui/styles.ts).
 */

const MAX_WIDTH = 120;
const HEIGHT = 12;

type YearsCellValue = Extract<CellValue, { type: 'years' }>;

/** Every decade from the first to the last, with its count (0 in a gap). */
export function decadeBars(
  decades: YearsCellValue['decades'],
): { decade: number; count: number }[] {
  if (decades.length === 0) return [];
  const counts = new Map(
    decades.map((d) => [parseInt(d.decade, 10), d.count] as const),
  );
  const starts = [...counts.keys()].filter(Number.isFinite);
  if (starts.length === 0) return [];
  const first = Math.min(...starts);
  const last = Math.max(...starts);
  const bars = [];
  for (let decade = first; decade <= last; decade += 10) {
    bars.push({ decade, count: counts.get(decade) ?? 0 });
  }
  return bars;
}

export const YearsCell = ({
  cell,
  width,
}: {
  cell: YearsCellValue;
  /** The room inside the cell, in px. */
  width: number;
}) => {
  if (cell.first === undefined) return <EmptyNote note={cell.note} />;
  const bars = decadeBars(cell.decades);
  const max = Math.max(1, ...bars.map((b) => b.count));
  const chart = Math.max(24, Math.min(MAX_WIDTH, width));
  const slot = bars.length ? chart / bars.length : chart;
  const barWidth = slot >= 3 ? slot - 1 : Math.max(0.5, slot);
  const span = yearSpan(cell.first, cell.last);
  const title = [
    span,
    bars
      .filter((b) => b.count > 0)
      .map((b) => `${b.decade}s ${b.count}`)
      .join(' · '),
    cell.parts.map((p) => `${p.label} ${p.count}`).join(' · '),
  ]
    .filter(Boolean)
    .join(' — ');
  return (
    <div className="flex min-w-0 flex-col justify-center gap-1" title={title}>
      <span className="truncate text-xs leading-4 tabular-nums text-white/75">
        {span}
      </span>
      {bars.length > 1 && (
        <svg
          aria-hidden
          width={chart}
          height={HEIGHT}
          viewBox={`0 0 ${chart} ${HEIGHT}`}
          className="shrink-0"
        >
          {bars.map((bar, i) => {
            const h = bar.count ? Math.max(1.5, (bar.count / max) * HEIGHT) : 0;
            return (
              <rect
                key={bar.decade}
                x={i * slot}
                y={HEIGHT - h}
                width={barWidth}
                height={h}
                className="fill-white/45"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};
