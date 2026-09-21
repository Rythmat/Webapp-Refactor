import { getChordTheory } from './chordTheoryMap';
import {
  FAMILY_INTERVALS,
  FAMILY_MODES,
  MODE_DISPLAY,
  PARENT_SCALE_INFO,
} from './insightConstants';

/**
 * Where an Insight chord card's scale links point, and its degree sentence.
 *
 * A chord whose notes all belong to the song's scale is placed in that scale:
 * its mode is the one built on its root (A min7 in C major is A Aeolian, not
 * the Dorian a bare min7 would suggest) and its parent is the song's own
 * parent scale. Only chords outside the key fall back to the quality's
 * typical mode.
 */
export interface ChordModeContext {
  /** Mode built on the chord's root, e.g. 'aeolian'. */
  chordRootMode: string;
  /** The song's tonic read in the chord's scale family. */
  sessionMode: string | null;
  parentRootPc: number;
  /** First mode of the parent family, e.g. 'ionian'. */
  parentMode: string;
  /** The parent scale is the song's own key — no separate parent link. */
  isSessionParent: boolean;
  /** "Built on the 5th degree of C major", for chords in the key. */
  degreeSentence: string | null;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

/** How a key is said out loud: "C major", "A minor", otherwise "D Dorian". */
export function keyName(tonic: string, mode: string): string {
  if (mode === 'ionian') return `${tonic} major`;
  if (mode === 'aeolian') return `${tonic} minor`;
  return `${tonic} ${MODE_DISPLAY[mode] ?? mode}`;
}

export function chordModeContext({
  chordRootPc,
  quality,
  intervals,
  rootNote,
  mode,
  tonicName,
}: {
  chordRootPc: number;
  quality: string;
  /** Chord tones in semitones above the root. */
  intervals: readonly number[];
  /** Song tonic pitch class and mode (ALL_MODES key). */
  rootNote: number;
  mode: string;
  /** Spelled song tonic, e.g. "E♭". */
  tonicName: string;
}): ChordModeContext {
  const inKey = placeInKey(chordRootPc, intervals, rootNote, mode);
  if (inKey) {
    return {
      chordRootMode: inKey.chordRootMode,
      sessionMode: mode,
      parentRootPc: inKey.parentRootPc,
      parentMode: inKey.parentMode,
      isSessionParent: inKey.parentRootPc === rootNote,
      degreeSentence: `Built on the ${ORDINALS[inKey.degreeIdx]} degree of ${keyName(tonicName, mode)}`,
    };
  }

  // Outside the key: the quality's typical mode, read from the chord root.
  const chordRootMode = getChordTheory(quality).mode;
  const info = PARENT_SCALE_INFO[chordRootMode];
  const family = info?.family ?? 'Ionian';
  const parentRootPc = info ? (chordRootPc + info.offset) % 12 : chordRootPc;
  const sessionIdx =
    FAMILY_INTERVALS[family]?.indexOf((rootNote - parentRootPc + 12) % 12) ??
    -1;
  return {
    chordRootMode,
    sessionMode:
      sessionIdx >= 0 ? (FAMILY_MODES[family]?.[sessionIdx] ?? null) : null,
    parentRootPc,
    parentMode: FAMILY_MODES[family]?.[0] ?? chordRootMode,
    isSessionParent: !info || info.offset === 0 || parentRootPc === rootNote,
    degreeSentence: null,
  };
}

/** The chord placed in the song's scale, or null when a tone falls outside. */
function placeInKey(
  chordRootPc: number,
  intervals: readonly number[],
  rootNote: number,
  mode: string,
) {
  const info = PARENT_SCALE_INFO[mode];
  const familyIntervals = info && FAMILY_INTERVALS[info.family];
  const familyModes = info && FAMILY_MODES[info.family];
  if (!info || !familyIntervals || !familyModes) return null;

  const parentRootPc = (rootNote + info.offset) % 12;
  const scale = new Set(familyIntervals.map((i) => (parentRootPc + i) % 12));
  if (intervals.some((i) => !scale.has((chordRootPc + i) % 12))) return null;

  const familyIdx = familyIntervals.indexOf(
    (chordRootPc - parentRootPc + 12) % 12,
  );
  const sessionIdx = familyModes.indexOf(mode);
  if (familyIdx < 0 || sessionIdx < 0) return null;
  return {
    chordRootMode: familyModes[familyIdx],
    parentRootPc,
    parentMode: familyModes[0],
    // Degrees count from the song's tonic, as the card's hybrid label does.
    degreeIdx: (familyIdx - sessionIdx + 7) % 7,
  };
}

/** Qualities whose description would only restate the degree sentence. */
const PLAIN_TRIADS = new Set(['major', 'minor']);

/**
 * A card's theory line: where the chord sits in the key, then what it is —
 * "Built on the 2nd degree of C major. Minor 7th with natural 9th — smooth,
 * soulful". A plain triad in the key needs only the first half.
 */
export function chordDescription(
  quality: string,
  context: Pick<ChordModeContext, 'degreeSentence'>,
): string {
  const character = getChordTheory(quality).description;
  if (!context.degreeSentence) return character;
  if (PLAIN_TRIADS.has(quality)) return context.degreeSentence;
  return `${context.degreeSentence}. ${character}`;
}
