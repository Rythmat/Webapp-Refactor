/**
 * laneDegree.ts — the degree a chord-lane region holds in a key, read one way
 * for everything that counts the song's chords.
 *
 * Insight's chord cards and the song's analysis (sessionToUnison, whose
 * chord timeline the progression matcher reads) used to read a region apart:
 * the cards from its identity, the analysis from its degreeKey or the
 * degree before the space in its name, so a chord the prompt box wrote with
 * a letter name ('C maj') or none ('C') read as '1 major' in the
 * progression while its card said '5 major' (owner, 2026-10-25). Both ask
 * here now.
 */
import {
  identityIsCurrent,
  pitchesOfLabels,
  type IdentityLabels,
} from './chordIdentity';
import { chordLabels } from './chordLabels';
import type { KeyFrame } from './keyFrame';

/**
 * `region`'s degree key ('5 major', 'b7 dominant7') in `frame`. In the
 * song's own key (`songKey`) the region's degreeKey stands, as the lane
 * wrote it. Otherwise its degrees may count from another key, so the chord
 * is read from its identity, or its letter names, and placed in `frame`.
 * Undefined when its labels name no chord the app knows.
 */
export function laneDegreeKey(
  region: IdentityLabels,
  frame: KeyFrame,
  songKey: boolean,
): string | undefined {
  if (songKey && region.degreeKey) return region.degreeKey;
  const pitches = identityIsCurrent(region)
    ? region.identity
    : pitchesOfLabels(region, songKey ? frame : null);
  return pitches ? chordLabels(pitches, frame).degreeKey : undefined;
}
