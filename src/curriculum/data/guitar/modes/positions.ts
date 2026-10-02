// ── Guitar modes: scale positions ─────────────────────────────────────────
// One-octave positions drawn the way Book One draws them, for any scale. The
// same rules reproduce every Book One position (positions.test.ts):
// - the 7-note scale starts on the tonic on string 6 and climbs strings 6-4
//   inside frets [r−1, r+3], r being the tonic's fret (1-12);
// - a pentatonic starts on string 3 and climbs strings 3-1 up to fret t+3, t
//   being its first note's fret (0-11).
// A note stays on its string while it fits the window, else moves up one.

import { GUITAR_STRINGS_LOW_TO_HIGH } from '@/lib/guitar/fretboard';
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
