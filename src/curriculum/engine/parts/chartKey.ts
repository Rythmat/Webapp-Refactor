/**
 * chartKey.ts — the key a chart is in, as a part's key (a tonic and a Prism
 * mode), for the parts that follow its chords (followChords.ts): their
 * passing tones, and the colors a chord doesn't name (a 7th over a triad),
 * come from its notes.
 *
 * The tonic is the key picked for a preset progression, else the chart's
 * first chord, where a loop starts. The mode is the one, major or minor as
 * the chord on the tonic is, whose notes hold the most of the chart's chord
 * tones, the tonic chord's twice: a vamp on Cm7 and F7 is C dorian (the A of
 * F7 is its 6th), a minor blues on Cm and G7 C aeolian, a blues on G7 G
 * mixolydian.
 *
 * No audio and no React here.
 */

import { QUALITIES, type Chord } from '../bassLines/harmony';
import { SCALES } from '../genreGeneration/scaleRegistry';
import type { PartKey } from './part';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The modes a key may be in, the usual one first: it wins a tie. */
const MAJOR_MODES = ['ionian', 'mixolydian', 'lydian'] as const;
const MINOR_MODES = ['aeolian', 'dorian', 'phrygian'] as const;

const spec = (chord: Chord) => QUALITIES[chord.quality] ?? QUALITIES.maj;

/** A chord's pitch classes: its tones, and a slash chord's bass. */
function tonesOf(chord: Chord): number[] {
  const tones = spec(chord).tones.map((i) => mod12(chord.root + i));
  return chord.bass === null ? tones : [...tones, mod12(chord.bass)];
}

/**
 * The key of a chart's bars (a bar's chords split it evenly). `tonic` is the
 * key picked, when there is one, and `minor` whether it was picked as a
 * minor key; otherwise both come from the chart.
 */
export function chartKey(
  bars: readonly (readonly Chord[])[],
  tonic?: number,
  minor?: boolean,
): PartKey {
  const chords = bars
    .flatMap((bar) => bar.map((chord) => ({ chord, weight: 1 / bar.length })))
    .filter(({ chord }) => !chord.nc);
  const home = mod12(tonic ?? chords[0]?.chord.root ?? 0);
  // Major or minor as the first chord on the tonic with a third is: Asus2
  // then Am is A minor.
  const third = chords
    .filter(({ chord }) => mod12(chord.root) === home)
    .map(({ chord }) => spec(chord).third)
    .find((t) => t === 3 || t === 4);
  const isMinor = minor ?? third === 3;
  const modes = isMinor ? MINOR_MODES : MAJOR_MODES;
  let best: string = modes[0];
  let bestScore = -Infinity;
  for (const mode of modes) {
    const scale = new Set(SCALES[mode].map((i) => mod12(home + i)));
    // The chord on the tonic counts twice: G7 makes a G blues mixolydian.
    const score = chords.reduce(
      (sum, { chord, weight }) =>
        sum +
        weight *
          (mod12(chord.root) === home ? 2 : 1) *
          tonesOf(chord).filter((pc) => scale.has(pc)).length,
      0,
    );
    if (score > bestScore + 1e-9) {
      best = mode;
      bestScore = score;
    }
  }
  return { tonic: home, mode: best };
}
