import {
  VOICING_ALGORITHM_LIBRARY,
  type VoicingAlgorithmEntry,
} from '@/curriculum/data/voicingAlgorithmLibrary';
import { applyVoicing } from '@/curriculum/engine/voicingEngine';

/**
 * Voicing selection for the chord popup. A voicing is stored on the chord as
 * `voicingHint` — a bottom-to-top scale-degree stack (e.g. "3-5-1"), which is
 * exactly the `resultingOrder` of a `VOICING_ALGORITHM_LIBRARY` entry. We list
 * the entries that fit the chord's note count and re-voice its MIDI via the
 * existing `applyVoicing`.
 */

/** Voicing options applicable to a chord with `noteCount` notes. */
export const voicingOptions = (noteCount: number): VoicingAlgorithmEntry[] =>
  VOICING_ALGORITHM_LIBRARY.filter((v) => v.noteCount === noteCount);

const findVoicing = (
  hint: string,
  noteCount: number,
): VoicingAlgorithmEntry | undefined =>
  VOICING_ALGORITHM_LIBRARY.find(
    (v) => v.resultingOrder === hint && v.noteCount === noteCount,
  );

/**
 * Re-voice root-position MIDI (as returned by chordNameToMidi, lowest = root)
 * according to a `voicingHint`. Falls back to the input notes when the hint has
 * no matching algorithm for this note count.
 */
export const applyVoicingHint = (
  rootPositionMidi: number[],
  hint: string | undefined,
): number[] => {
  if (!hint || rootPositionMidi.length === 0) return rootPositionMidi;
  const algo = findVoicing(hint, rootPositionMidi.length);
  if (!algo) return rootPositionMidi;
  const root = rootPositionMidi[0];
  const intervals = rootPositionMidi.map((m) => m - root);
  return applyVoicing(intervals, algo.displacements).map((o) => root + o);
};
