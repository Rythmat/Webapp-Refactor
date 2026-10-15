import { memo, useMemo } from 'react';
import type { GuitarCenterId } from '@/curriculum/data/guitar/types';
import { familyChips } from './theoryUi';

// ── ChordFamilyStrip ───────────────────────────────────────────────────────
// The key's chords 1-7 as chips: chord symbol, then its Hybrid Number System
// label (and Roman numeral when that setting is on). Chip 7 is greyed: Book
// One plays it later, as a 7th chord.

export interface ChordFamilyStripProps {
  keyCenter: GuitarCenterId;
  keyColor: string;
  showRomanNumerals?: boolean;
  /** Accessible name of the list. */
  label?: string;
}

export const ChordFamilyStrip = memo(function ChordFamilyStrip({
  keyCenter,
  keyColor,
  showRomanNumerals = false,
  label = 'Chords in this key',
}: ChordFamilyStripProps) {
  const chips = useMemo(() => familyChips(keyCenter), [keyCenter]);
  return (
    <ol aria-label={label} className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <li
          key={chip.degree}
          data-family-chip={chip.degree}
          data-later={chip.later || undefined}
          className="flex min-w-[3.25rem] flex-col items-center rounded-lg px-2 py-1 text-center leading-tight"
          style={{
            border: chip.later
              ? '1px dashed var(--color-border, rgba(255,255,255,0.2))'
              : `1px solid ${keyColor}`,
            opacity: chip.later ? 0.55 : 1,
          }}
        >
          {/* The Roman numeral is read too when shown, not only seen. */}
          <span className="sr-only">
            {showRomanNumerals
              ? `${chip.ariaLabel}, ${chip.roman}`
              : chip.ariaLabel}
          </span>
          <span
            aria-hidden
            className="text-sm font-semibold"
            style={{
              color: chip.later ? 'var(--color-text-dim, #9a9aab)' : keyColor,
            }}
          >
            {chip.symbol}
          </span>
          <span
            aria-hidden
            className={chip.later ? 'max-w-24 text-[10px]' : 'text-[10px]'}
            style={{ color: 'var(--color-text-dim, #9a9aab)' }}
          >
            {chip.hybrid}
          </span>
          {showRomanNumerals && (
            <span
              data-roman
              aria-hidden
              className="text-[11px]"
              style={{ color: 'var(--color-text, #e8e8f0)' }}
            >
              {chip.roman}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
});
