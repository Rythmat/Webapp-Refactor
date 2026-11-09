import { cn } from '@/components/utilities';

// ── The chords, bar by bar ─────────────────────────────────────────────────
// Under the circle, where Part 1 sings its words, a chord step shows its
// progression as bars ("| 1 maj | 4 maj |"), the bar playing lit in the key
// color, as the words light syllable by syllable. A replay has a row per
// harmony: the triads, then the 7ths.

export interface ChordBarRow {
  /** "Triads", "With 7ths": what the row is, when there's more than one. */
  label?: string;
  bars: readonly { label: string; lit: boolean }[];
}

export interface ChordBarsProps {
  rows: readonly ChordBarRow[];
  keyColor: string;
  compact?: boolean;
}

export function ChordBars({ rows, keyColor, compact }: ChordBarsProps) {
  return (
    <div
      data-literacy-chord-bars
      className={cn(
        'flex w-full flex-col gap-2',
        compact ? 'items-start' : 'items-center',
      )}
    >
      {rows.map((row, r) => (
        <div
          key={r}
          className={cn(
            'flex w-full max-w-[520px] items-center gap-3',
            !compact && 'justify-center',
          )}
        >
          {row.label && (
            <span className="w-[72px] shrink-0 text-right text-[11px] uppercase tracking-[0.14em] text-white/45">
              {row.label}
            </span>
          )}
          <ol
            aria-label={row.label ?? 'The chords'}
            className="flex min-w-0 flex-1 border-x-2 border-white/35"
          >
            {row.bars.map((bar, b) => (
              <li
                key={b}
                data-chord-bar={b}
                data-lit={bar.lit || undefined}
                className={cn(
                  'flex min-w-0 flex-1 justify-center px-1 py-1',
                  b > 0 && 'border-l border-white/20',
                )}
              >
                <span
                  className="w-full truncate rounded-md px-1.5 py-1 text-center text-[clamp(14px,1.3vw,18px)] font-semibold leading-6 transition-colors duration-75"
                  style={
                    bar.lit
                      ? { backgroundColor: keyColor, color: '#101012' }
                      : { color: '#e8e8f0' }
                  }
                >
                  {bar.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
