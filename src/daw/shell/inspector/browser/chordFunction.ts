/**
 * chordFunction.ts — a part's chords as Roman numerals (milestone 2.14).
 *
 * A Library part row says what its chords do — "I–V–vi–IV" — which Soundtrap's
 * loops never show. The numerals are read from the part's chord symbols
 * (letters written in its own key) in that key, so moving the part into the
 * song's key leaves them as they are. Repeats collapse: a chord held for two
 * bars is one numeral, and a progression played twice is shown once.
 *
 * Roman numerals whatever the student's chord-notation setting: the hybrid
 * names ("1 maj – 5 maj – 6 min – 4 maj") don't fit a row.
 */

import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import { formatChordLabel } from '@/lib/chordNotation';

/** The joiner between numerals: an en dash, as the plan writes them. */
const DASH = '–';

const cache = new Map<string, string | null>();

/** The shortest cycle `items` repeats (a partial last pass allowed). */
function oneCycle<T>(items: readonly T[]): readonly T[] {
  for (let period = 1; period < items.length; period++) {
    if (items.every((item, i) => item === items[i % period])) {
      return items.slice(0, period);
    }
  }
  return items;
}

/** The numerals of `symbols` in `key`, repeats collapsed. */
export function numeralsOf(
  symbols: readonly string[],
  key: InstrumentPart['key'],
): string[] {
  const numerals = symbols
    .map((symbol) =>
      formatChordLabel(symbol, 'roman', {
        keyRootPc: key.tonic,
        mode: key.mode,
      }),
    )
    .filter((numeral, i, all) => i === 0 || numeral !== all[i - 1]);
  // A loop's last chord leading back to its first counts as one pass.
  const looped =
    numerals.length > 2 && numerals.at(-1) === numerals[0]
      ? numerals.slice(0, -1)
      : numerals;
  const cycle = oneCycle(looped);
  return cycle.length < looped.length ? [...cycle] : numerals;
}

/**
 * The part's chord function ("I–V–vi–IV"), or null when it has no chord
 * symbols. Cached per part id.
 */
export function chordFunction(
  part: Pick<InstrumentPart, 'id' | 'key' | 'chordSymbols'>,
): string | null {
  const kept = cache.get(part.id);
  if (kept !== undefined) return kept;
  const symbols = part.chordSymbols ?? [];
  const label = symbols.length
    ? numeralsOf(symbols, part.key).join(DASH)
    : null;
  cache.set(part.id, label);
  return label;
}
