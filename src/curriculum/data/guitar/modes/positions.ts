// ── Guitar modes: scale positions ─────────────────────────────────────────
// One-octave positions drawn the way Book One draws them, for any scale. The
// same rules reproduce every Book One position (positions.test.ts):
// - the 7-note scale starts on the tonic on string 6 and climbs strings 6-4
//   inside frets [r−1, r+3], r being the tonic's fret (1-12);
// - a pentatonic starts on string 3 and climbs strings 3-1 up to fret t+3, t
//   being its first note's fret (0-11).
// A note stays on its string while it fits the window, else moves up one.

import { GUITAR_STRINGS_LOW_TO_HIGH } from '@/lib/guitar/fretboard';
import { suggestedFingers } from '@/lib/guitar/theory/scaleTheory';
import type { FretPosition, GuitarStringNumber } from '@/lib/guitar/types';
import type { GuitarScalePosition, GuitarScaleSlot } from '../types';

const OPEN_MIDI: Readonly<Record<GuitarStringNumber, number>> = {
  6: 40,
  5: 45,
  4: 50,
  3: 55,
  2: 59,
  1: 64,
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Lay ascending notes on strings from `lowest` up, each fret ≤ `lastFret`. */
function layOut(
  midis: readonly number[],
  lowest: GuitarStringNumber,
  lastFret: number,
): FretPosition[] {
  let string = lowest;
  return midis.map((midi) => {
    while (midi - OPEN_MIDI[string] > lastFret) {
      if (string === 1) throw new Error(`No string for MIDI ${midi}`);
      string = (string - 1) as GuitarStringNumber;
    }
    return { string, fret: midi - OPEN_MIDI[string] };
  });
}

function position(
  id: GuitarScaleSlot,
  playOrder: FretPosition[],
  fretStart: number,
): GuitarScalePosition {
  const used = new Set(playOrder.map((p) => p.string));
  return {
    id,
    fretStart,
    fretEnd: fretStart + 4,
    unusedStrings: GUITAR_STRINGS_LOW_TO_HIGH.filter((s) => !used.has(s)),
    playOrder,
  };
}

/** A 7-note scale, tonic to tonic, from string 6. */
export function scalePosition(
  tonicPc: number,
  steps: readonly number[],
): GuitarScalePosition {
  const r = mod12(tonicPc - 4) || 12;
  const midis = [...steps, 12].map((s) => OPEN_MIDI[6] + r + s);
  return position('major', layOut(midis, 6, r + 3), Math.max(1, r - 1));
}

/**
 * A pentatonic from its first degree to that note's octave, from string 3.
 * @param degrees - Degrees of the scale `steps` describes, first note first.
 */
export function pentatonicPosition(
  tonicPc: number,
  steps: readonly number[],
  degrees: readonly number[],
  id: GuitarScaleSlot = 'pentatonic',
): GuitarScalePosition {
  const first = steps[degrees[0] - 1];
  const t = mod12(tonicPc + first - 7); // open string 3 is G, pitch class 7
  const above = degrees
    .map((d) => mod12(steps[d - 1] - first))
    .sort((a, b) => a - b);
  const midis = [...above, 12].map((s) => OPEN_MIDI[3] + t + s);
  return position(id, layOut(midis, 3, t + 3), t <= 2 ? 1 : t);
}

// ── Positions for the rest of Theory ──────────────────────────────────────
// Scales with an augmented 2nd or several half steps in a row do not always
// sit in Book One's window. A position is comfortable when it spans at most
// five frets, no string spans more than four, no string holds more than four
// notes, and every fretted note gets a finger (suggestedFingers). Book One's
// layout is kept when it is comfortable; otherwise the most compact layout
// with the tonic on string 6 is used, and failing that, on string 5.

/** The highest fret a generated position may use. */
const MAX_POSITION_FRET = 15;

/** Whether a hand can play the position (see the section comment). */
export function isComfortablePosition(position: GuitarScalePosition): boolean {
  const fretted = position.playOrder.filter((p) => p.fret > 0);
  if (fretted.length === 0) return false;
  const frets = fretted.map((p) => p.fret);
  if (Math.max(...frets) - Math.min(...frets) > 4) return false;
  const byString = new Map<GuitarStringNumber, number[]>();
  for (const p of position.playOrder) {
    byString.set(p.string, [...(byString.get(p.string) ?? []), p.fret]);
  }
  for (const onString of byString.values()) {
    if (onString.length > 4) return false;
    if (Math.max(...onString) - Math.min(...onString) > 3) return false;
  }
  const { fingers } = suggestedFingers(position);
  return position.playOrder.every(
    (p, i) => p.fret === 0 || fingers[i] !== null,
  );
}

/** Every way to lay ascending notes on strings, moving only up, frets 1-15. */
function layouts(
  midis: readonly number[],
  first: GuitarStringNumber,
): FretPosition[][] {
  const out: FretPosition[][] = [];
  const walk = (i: number, string: GuitarStringNumber, acc: FretPosition[]) => {
    if (i === midis.length) {
      out.push(acc);
      return;
    }
    for (let s = string; s >= 1; s--) {
      const fret = midis[i] - OPEN_MIDI[s as GuitarStringNumber];
      if (fret < 1) break; // higher strings only go lower
      if (fret > MAX_POSITION_FRET) continue;
      walk(i + 1, s as GuitarStringNumber, [
        ...acc,
        { string: s as GuitarStringNumber, fret },
      ]);
    }
  };
  const fret = midis[0] - OPEN_MIDI[first];
  if (fret >= 1 && fret <= MAX_POSITION_FRET) {
    walk(1, first, [{ string: first, fret }]);
  }
  return out;
}

/** Smaller is better: span, frets used, strings used, distance from `near`. */
function layoutCost(
  playOrder: readonly FretPosition[],
  near: number,
): number[] {
  const frets = playOrder.map((p) => p.fret);
  const lo = Math.min(...frets);
  const hi = Math.max(...frets);
  return [
    hi - lo,
    new Set(frets).size,
    new Set(playOrder.map((p) => p.string)).size,
    Math.abs(lo - near),
    lo,
  ];
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/** The most compact comfortable layout of the tonic-to-tonic octave, or null. */
function searchPosition(
  tonicPc: number,
  steps: readonly number[],
  first: GuitarStringNumber,
  near: number,
): GuitarScalePosition | null {
  let best: { position: GuitarScalePosition; cost: number[] } | null = null;
  const base = mod12(tonicPc - OPEN_MIDI[first]);
  for (const tonicFret of [base, base + 12]) {
    if (tonicFret < 1 || tonicFret > MAX_POSITION_FRET) continue;
    const midis = [...steps, 12].map((s) => OPEN_MIDI[first] + tonicFret + s);
    for (const playOrder of layouts(midis, first)) {
      const lo = Math.min(...playOrder.map((p) => p.fret));
      const candidate = position('major', playOrder, lo);
      if (!isComfortablePosition(candidate)) continue;
      const cost = layoutCost(playOrder, near);
      if (!best || lexLess(cost, best.cost))
        best = { position: candidate, cost };
    }
  }
  return best?.position ?? null;
}

/**
 * A comfortable one-octave position of any scale, tonic to tonic: Book One's
 * own layout where a hand can play it, else the most compact one with the
 * tonic on string 6, else on string 5.
 */
export function playableScalePosition(
  tonicPc: number,
  steps: readonly number[],
): GuitarScalePosition {
  const book = scalePosition(tonicPc, steps);
  if (isComfortablePosition(book)) return book;
  const found =
    searchPosition(tonicPc, steps, 6, book.fretStart) ??
    searchPosition(tonicPc, steps, 5, book.fretStart);
  if (!found) throw new Error(`No playable position for ${steps}`);
  return found;
}
