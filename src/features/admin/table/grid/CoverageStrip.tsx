import { cn } from '@/components/utilities';
import type { CoverageEntry } from './coverage';

/**
 * How much of each stored column the listed rows state — "City 0/907 · song
 * pins ≈250" — with a hairline bar each, so the gain in fidelity can be
 * watched as values are accepted. Clicking an entry lists the rows missing
 * it (its `missing-*` filter), and again to stop.
 */
export const CoverageStrip = ({
  entries,
  active,
  onToggle,
}: {
  entries: readonly CoverageEntry[];
  /** The filters on. */
  active: readonly string[];
  onToggle(filter: string): void;
}) => {
  if (entries.length === 0) return null;
  return (
    <ul
      aria-label="Coverage of stored fields"
      className="flex shrink-0 flex-wrap items-stretch gap-x-5 gap-y-2 border-b border-white/[0.06] px-6 py-2"
    >
      {entries.map((entry) => {
        const on = entry.filter ? active.includes(entry.filter) : false;
        const share = entry.total ? entry.filled / entry.total : 0;
        const standIns = entry.standIns
          .map((s) => `${s.label} ≈${s.count}`)
          .join(' · ');
        const body = (
          <>
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className={on ? 'text-white' : 'text-white/70'}>
                {entry.label}
              </span>
              <span className="tabular-nums text-white/55">
                {entry.filled}/{entry.total}
              </span>
              {standIns && <span className="text-white/55">· {standIns}</span>}
            </span>
            <span aria-hidden className="block h-px w-full bg-white/10">
              <span
                className="block h-px bg-white/60"
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </span>
          </>
        );
        const title = `${entry.filled} of ${entry.total} state ${entry.label}${
          standIns ? `; of the rest, ${standIns} could say it` : ''
        }`;
        return (
          <li key={entry.column}>
            {entry.filter ? (
              <button
                type="button"
                aria-pressed={on}
                title={`${title}. ${on ? 'Show all rows' : 'List the rows missing it'}`}
                onClick={() => onToggle(entry.filter!)}
                className={cn(
                  'flex flex-col gap-1 rounded text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  'hover:text-white',
                )}
              >
                {body}
              </button>
            ) : (
              <div title={title} className="flex flex-col gap-1 text-xs">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
