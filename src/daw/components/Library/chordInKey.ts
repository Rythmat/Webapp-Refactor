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

/**
 * Where a chord outside the song's key comes from, so its lessons open the
 * scale it was taken from (owner, 2026-10-24): a borrowed chord's source
 * mode on the song's tonic (A♭ in C major, from C Aeolian, is A♭ Lydian of
 * E♭ major), or the key a secondary dominant points at (D7 in C major, the
 * 5 of 5, is D Mixolydian of G major; E7, the 5 of 6, is E Phrygian Dominant
 * of A harmonic minor).
 */
export type ChordSource =
  | { kind: 'borrowed'; mode: string }
  | { kind: 'tonicizes'; rootPc: number; minor: boolean };

export function chordModeContext({
  chordRootPc,
  quality,
  intervals,
  rootNote,
  mode,
  tonicName,
  source,
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
  /** Where the chord comes from, when it's outside the key. */
  source?: ChordSource | null;
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

  // Outside the key: placed in the scale it comes from, when that holds it.
  const from = placeInSource(chordRootPc, intervals, rootNote, source);
  if (from) {
    return {
      chordRootMode: from.chordRootMode,
      sessionMode: from.scaleMode,
      parentRootPc: from.parentRootPc,
      parentMode: from.parentMode,
      isSessionParent: false,
      degreeSentence: null,
    };
  }

  // Else the quality's typical mode, read from the chord root.
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

/**
 * The scale a chord from outside the key is read in — its borrowed source on
 * the song's tonic, or the key it tonicizes (a minor target in its harmonic
 * minor, whose 5 chord is major, else natural minor) — with the chord placed
 * in it. Null when the chord doesn't fit there either.
 */
export function placeInSource(
  chordRootPc: number,
  intervals: readonly number[],
  rootNote: number,
  source: ChordSource | null | undefined,
):
  | (NonNullable<ReturnType<typeof placeInKey>> & {
      scaleRootPc: number;
      scaleMode: string;
    })
  | null {
  if (!source) return null;
  const scales: [number, string][] =
    source.kind === 'borrowed'
      ? [[rootNote, source.mode]]
      : source.minor
        ? [
            [source.rootPc, 'harmonicMinor'],
            [source.rootPc, 'aeolian'],
          ]
        : [[source.rootPc, 'ionian']];
  for (const [scaleRootPc, scaleMode] of scales) {
    const placed = placeInKey(chordRootPc, intervals, scaleRootPc, scaleMode);
    if (placed) return { ...placed, scaleRootPc, scaleMode };
  }
  return null;
}

/** The chord placed in a scale, or null when a tone falls outside. */
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
  // Slash chords' basses sit below the root, at negative intervals.
  if (intervals.some((i) => !scale.has((((chordRootPc + i) % 12) + 12) % 12)))
    return null;

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

/** Qualities whose description would only restate where the chord sits. */
const PLAIN_TRIADS = new Set(['major', 'minor']);

/**
 * A card's theory line: what the chord is — "Minor 7th with natural 9th —
 * smooth, soulful". The degree sentence ("Built on the 2nd degree of C
 * major") no longer leads it (owner, 2026-10-24): the card's number and its
 * Mode / Parent scale lessons say where it sits. A plain triad in the key
 * has nothing more to say, so it gets no line.
 */
export function chordDescription(
  quality: string,
  context: Pick<ChordModeContext, 'degreeSentence'>,
): string {
  const character = getChordTheory(quality).description;
  if (context.degreeSentence && PLAIN_TRIADS.has(quality)) return '';
  return character;
}
