/**
 * The library progressions a chord part plays (piano and guitar parts that
 * say what chords they were written over), so the Parts Library can be
 * browsed by progression.
 *
 * A part's `chordSymbols` are one per bar, looping, in the part's key — the
 * same shape as a genre activity step's — so they are read the way the
 * progression crosscheck reads a step (content/harmony): a minor or modal
 * part from its own tonic and from its parent major. Only strong matches
 * count: the part plays the progression from its top, or as a phrase.
 */

import {
  type HarmonyMatch,
  type ProgressionLike,
  buildHarmonyIndex,
  isStrongMatch,
} from '@/content/harmony';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';

const PC_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

/** Chord instruments only: a bass or drum part names no progression. */
export const isChordPart = (part: Pick<InstrumentPart, 'instrument'>) =>
  part.instrument === 'piano' || part.instrument === 'guitar';

/** Each chord part's progressions, by part id, strongest first. */
export function partProgressions(
  parts: readonly InstrumentPart[],
  progressions: readonly ProgressionLike[],
): Map<string, HarmonyMatch[]> {
  const chordParts = parts.filter(
    (p) => isChordPart(p) && (p.chordSymbols?.length ?? 0) > 0,
  );
  const index = buildHarmonyIndex({
    progressions,
    // Each part is one loop, read as a genre step is.
    flows: chordParts.map((p) => ({
      genre: 'part',
      level: 0,
      params: { defaultKey: `${PC_NAMES[p.key.tonic]} ${p.key.mode}` },
      sections: [
        {
          id: p.id,
          steps: [
            { stepNumber: 0, activity: p.id, chordSymbols: p.chordSymbols },
          ],
        },
      ],
    })),
  });
  const out = new Map<string, HarmonyMatch[]>();
  for (const match of index.matches) {
    if (match.source.kind !== 'activity' || !isStrongMatch(match)) continue;
    const id = match.source.activity;
    const list = out.get(id) ?? [];
    // A loop played twice is one use of the progression: its first.
    if (!list.some((m) => m.progressionId === match.progressionId))
      out.set(id, [...list, match]);
  }
  return out;
}
