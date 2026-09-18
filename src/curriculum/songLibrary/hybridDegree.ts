import {
  parseNoteName,
  type SpelledNote,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';

/**
 * Hybrid Number System degrees for song-library chords.
 *
 * A degree counts from the MAJOR scale of the key's tonic, whatever the mode:
 * in A minor, C is `♭3` and G is `♭7`; in C major, B♭ is `♭7` and F♯ is `♯4`.
 * The accidental comes from the chord root's letter spelling — count letters
 * up from the tonic letter, then compare the root to that major-scale degree —
 * so in C, D♭ is `♭2` and C♯ is `♯1`.
 *
 * A spelling that would produce `♭1`, `♯3`, `♭4`, `♯7` or a double accidental
 * is an enharmonic misspelling of the chord (G♯ in an E♭ song), not a real
 * degree, so those fall back to the plain pitch-class degree.
 */

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = LETTER_PC; // the C major scale is the letter grid itself
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PC_DEGREE = [
  '1',
  '♭2',
  '2',
  '♭3',
  '3',
  '4',
  '♯4',
  '5',
  '♭6',
  '6',
  '♭7',
  '7',
];

const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** Pitch class 0–11 of a spelled note. */
export const spelledPitchClass = (note: SpelledNote): number =>
  mod12(LETTER_PC[note.letterIndex] + note.accidental);
const pcOf = spelledPitchClass;

const ROOT_TOKEN = /^([A-G](?:♯♯|♭♭|♯|♭|#|b)?)/;
const BASS_TOKEN = /\/\s*([A-G](?:♯|♭|#|b)?)\s*$/;

export const isNoChord = (chordName: string): boolean =>
  /^N\.?C\.?$/i.test(chordName.trim());

/** Chord symbol → spelled root and optional slash bass ('B♭7/D' → B♭, D). */
export function chordRootAndBass(
  chordName: string,
): { root: SpelledNote; bass: SpelledNote | null } | null {
  const rootToken = chordName.trim().match(ROOT_TOKEN);
  const root = rootToken ? parseNoteName(rootToken[1]) : null;
  if (!root) return null;
  const bassToken = chordName.match(BASS_TOKEN);
  return { root, bass: bassToken ? parseNoteName(bassToken[1]) : null };
}

/** Purely letter-based degree, e.g. tonic A, note C → '♭3'. */
function letterDegree(tonic: SpelledNote, note: SpelledNote): string {
  const steps = (note.letterIndex - tonic.letterIndex + 7) % 7;
  const scalePc = mod12(pcOf(tonic) + MAJOR_STEPS[steps]);
  let diff = mod12(pcOf(note) - scalePc);
  if (diff > 6) diff -= 12;
  const accidental = diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff);
  return `${accidental}${steps + 1}`;
}

const isMisspelling = (degree: string): boolean =>
  /^(♭1|♯3|♭4|♯7)$/.test(degree) || /♯♯|♭♭/.test(degree);

/** Hybrid degree of `note` in the key of `tonic`, e.g. ('A', 'G') → '♭7'. */
export function hybridDegree(tonic: SpelledNote, note: SpelledNote): string {
  const degree = letterDegree(tonic, note);
  return isMisspelling(degree)
    ? PC_DEGREE[mod12(pcOf(note) - pcOf(tonic))]
    : degree;
}

/**
 * The tonic spelling a song's chords are written against. Usually the key's
 * own spelling, but some charts declare 'D♭ minor' while spelling every chord
 * from C♯ — pick whichever enharmonic spelling of the tonic leaves the fewest
 * accidentals across the chords (ties keep the declared spelling).
 */
export function songTonic(
  key: string,
  chordNames: readonly string[],
): SpelledNote | null {
  const declaredToken = key.trim().match(ROOT_TOKEN);
  const declared = declaredToken ? parseNoteName(declaredToken[1]) : null;
  if (!declared) return null;

  const roots = chordNames
    .filter((name) => !isNoChord(name))
    .map((name) => chordRootAndBass(name)?.root)
    .filter((root): root is SpelledNote => root != null);
  const cost = (tonic: SpelledNote) =>
    roots.reduce((sum, root) => {
      const degree = letterDegree(tonic, root);
      const accidentals = degree.length - degree.replace(/[♭♯]/g, '').length;
      return sum + accidentals * accidentals + (isMisspelling(degree) ? 10 : 0);
    }, 0);

  let best = declared;
  let bestCost = cost(declared);
  const tonicPc = pcOf(declared);
  for (let letterIndex = 0; letterIndex < LETTERS.length; letterIndex++) {
    for (const accidental of [0, 1, -1]) {
      const candidate = { letterIndex, accidental };
      if (pcOf(candidate) !== tonicPc) continue;
      const candidateCost = cost(candidate);
      if (candidateCost < bestCost) {
        best = candidate;
        bestCost = candidateCost;
      }
    }
  }
  return best;
}

/**
 * Degree numbers ('♭7', and '3' for a slash bass) that a chord symbol should
 * carry in a song keyed on `tonic`. Null for N.C. or an unparseable symbol.
 */
export function expectedDegreeNumbers(
  chordName: string,
  tonic: SpelledNote,
): { root: string; bass: string | null } | null {
  if (isNoChord(chordName)) return null;
  const parsed = chordRootAndBass(chordName);
  if (!parsed) return null;
  return {
    root: hybridDegree(tonic, parsed.root),
    bass: parsed.bass ? hybridDegree(tonic, parsed.bass) : null,
  };
}

/** Split a stored label like '♭7 min7/3' into its degree, quality and bass. */
export function splitDegreeLabel(
  label: string,
): { root: string; quality: string; bass: string | null } | null {
  const match = label.match(/^([♭♯]*\d+)(?: (.*?))?(?:\/([♭♯]*\d+))?$/);
  if (!match) return null;
  return { root: match[1], quality: match[2] ?? '', bass: match[3] ?? null };
}
