/**
 * One chord, read the same way wherever the app writes it, so a progression
 * in the library can be found in a song chart or a genre activity.
 *
 * Three vocabularies meet here:
 *  - the progression library: '1 major7', 'b2 dominant7', '4 minor6/b3';
 *  - song charts (hybrid numbering): '1 maj', '♭6 dom7', '2 min7/5', 'n.c.';
 *  - genre activities (letter names in the level's key): 'Am9', 'E7#5',
 *    'Bbmaj7/F', 'Afunk9'.
 *
 * Every one becomes a root counted in semitones from the TONIC (degrees are
 * tonic-relative everywhere they are shown: "1 min7" is the tonic chord of A
 * minor) and a quality, read at three strengths:
 *  - `quality` — the chord as written ('maj7', 'dom9');
 *  - `family` — what the chord does ('maj', 'dom', 'min', 'halfdim', …): a
 *    chart's '1 maj' and the library's '1 major7' are one family, since the
 *    charts rarely spell a major seventh;
 *  - `colour` — major or minor third: the library's triad '5 major' against
 *    a chart's '5 dom7'.
 *
 * The slash bass counts only at `exact`, read from the key as the charts
 * count it ('F/C' in F is '1 maj/5'): the library mostly agrees ('1 major -
 * 4 major/1 - 1 major' is a pedal), but not always ('4 minor6/b3' is F–6/A♭,
 * counted from the chord), so the looser tiers leave the bass out.
 *
 * Self-contained on purpose: the matcher runs in the console's lazy Table
 * chunk and in tests, and the shared quality tables (`lib/chordNotation`)
 * pull in the whole Prism engine.
 */

export type ChordFamily =
  | 'maj'
  | 'dom'
  | 'min'
  | 'halfdim'
  | 'dim'
  | 'aug'
  | 'sus'
  | 'power';

export type ChordColour = 'major' | 'minor' | 'either';

export interface HarmonyChord {
  /** Root, in semitones above the tonic (0–11). */
  pc: number;
  /** The quality, one spelling per chord: 'maj', 'min7', 'dom7#5'. */
  quality: string;
  family: ChordFamily;
  colour: ChordColour;
  /**
   * The slash bass, in semitones above the tonic, when it is not the root:
   * '4 maj/1' (F/C in C) has 0. Compared only at `exact`.
   */
  bassPc?: number;
}

/** How strictly two chords are compared, strictest first. */
export type MatchTier = 'exact' | 'family' | 'loose';
export const MATCH_TIERS: readonly MatchTier[] = ['exact', 'family', 'loose'];

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

const ascii = (s: string) =>
  s
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/[–−—]/g, '-')
    .replace(/Δ|△/g, 'maj');

/** 'b3', '♭3', '#4' → semitones above the tonic; null when not a degree. */
export function degreeToPc(degree: string): number | null {
  const m = /^([b#]*)([1-7])$/.exec(ascii(degree.trim()));
  if (!m) return null;
  let pc = MAJOR_SCALE[Number(m[2]) - 1];
  for (const sign of m[1]) pc += sign === 'b' ? -1 : 1;
  return ((pc % 12) + 12) % 12;
}

/**
 * Every quality spelling the three vocabularies use, compacted (lower case,
 * ASCII, no spaces or parentheses), mapped to one spelling.
 */
const QUALITY_ALIASES: Record<string, string> = {
  '': 'maj',
  maj: 'maj',
  major: 'maj',
  min: 'min',
  minor: 'min',
  m: 'min',
  '-': 'min',
  maj7: 'maj7',
  major7: 'maj7',
  ma7: 'maj7',
  maj9: 'maj9',
  major9: 'maj9',
  maj6: 'maj6',
  major6: 'maj6',
  '6': 'maj6',
  maj69: 'maj69',
  '69': 'maj69',
  '6/9': 'maj69',
  add2: 'add2',
  add9: 'add2',
  majadd2: 'add2',
  majadd9: 'add2',
  add4: 'add4',
  'maj7#11': 'maj7#11',
  'major7#11': 'maj7#11',
  min7: 'min7',
  minor7: 'min7',
  m7: 'min7',
  '-7': 'min7',
  min9: 'min9',
  minor9: 'min9',
  m9: 'min9',
  '-9': 'min9',
  min11: 'min11',
  m11: 'min11',
  min6: 'min6',
  minor6: 'min6',
  m6: 'min6',
  minadd2: 'minadd2',
  madd2: 'minadd2',
  minadd9: 'minadd2',
  madd9: 'minadd2',
  minmaj7: 'minmaj7',
  minormajor7: 'minmaj7',
  mmaj7: 'minmaj7',
  dom7: 'dom7',
  dominant7: 'dom7',
  '7': 'dom7',
  dom9: 'dom9',
  dominant9: 'dom9',
  '9': 'dom9',
  dom11: 'dom11',
  '11': 'dom11',
  dom13: 'dom13',
  dominant13: 'dom13',
  '13': 'dom13',
  'dom7#5': 'dom7#5',
  'dominant7#5': 'dom7#5',
  '7#5': 'dom7#5',
  aug7: 'dom7#5',
  dom7b5: 'dom7b5',
  dominant7b5: 'dom7b5',
  '7b5': 'dom7b5',
  dom7b9: 'dom7b9',
  dominant7b9: 'dom7b9',
  '7b9': 'dom7b9',
  'dom7#9': 'dom7#9',
  '7#9': 'dom7#9',
  'dom7#11': 'dom7#11',
  'dominant7#11': 'dom7#11',
  '7#11': 'dom7#11',
  '7alt': 'dom7alt',
  dom7alt: 'dom7alt',
  // Music Atlas's own rootless ♭7-9-5 funk voicing: a dominant ninth.
  funk9: 'funk9',
  dom7sus4: 'dom7sus4',
  dominant7sus4: 'dom7sus4',
  '7sus4': 'dom7sus4',
  '7sus': 'dom7sus4',
  dom9sus4: 'dom9sus4',
  '9sus4': 'dom9sus4',
  sus4: 'sus4',
  sus: 'sus4',
  sus2: 'sus2',
  dim: 'dim',
  diminished: 'dim',
  '°': 'dim',
  dim7: 'dim7',
  diminished7: 'dim7',
  '°7': 'dim7',
  min7b5: 'min7b5',
  minor7b5: 'min7b5',
  m7b5: 'min7b5',
  '-7b5': 'min7b5',
  ø: 'min7b5',
  ø7: 'min7b5',
  aug: 'aug',
  augmented: 'aug',
  '+': 'aug',
  '5': 'power',
  power: 'power',
};

const compact = (s: string) =>
  ascii(s)
    .toLowerCase()
    .replace(/[()\s]/g, '');

/** The one spelling of a quality; null when the text is not one we know. */
export function canonicalQuality(raw: string): string | null {
  const text = compact(raw);
  // 'M7' is major seventh before lower-casing loses it.
  if (/^M7$/.test(ascii(raw).trim())) return 'maj7';
  return QUALITY_ALIASES[text] ?? null;
}

function familyOf(quality: string): ChordFamily {
  if (quality === 'min7b5') return 'halfdim';
  if (quality.startsWith('dim')) return 'dim';
  if (quality === 'aug') return 'aug';
  if (quality === 'power') return 'power';
  if (quality === 'sus4' || quality === 'sus2') return 'sus';
  if (quality.startsWith('min')) return 'min';
  if (quality.startsWith('dom') || quality === 'funk9') return 'dom';
  return 'maj';
}

const COLOUR: Record<ChordFamily, ChordColour> = {
  maj: 'major',
  dom: 'major',
  aug: 'major',
  min: 'minor',
  halfdim: 'minor',
  dim: 'minor',
  sus: 'either',
  power: 'either',
};

function chordOf(
  pc: number,
  rawQuality: string,
  bassPc: number | null = null,
): HarmonyChord | null {
  const quality = canonicalQuality(rawQuality);
  if (!quality) return null;
  const family = familyOf(quality);
  return {
    pc,
    quality,
    family,
    colour: COLOUR[family],
    ...(bassPc !== null && bassPc !== pc ? { bassPc } : {}),
  };
}

/** Split 'maj7/3' into its quality and slash bass; '6/9' keeps its slash. */
function splitBass(rest: string): { quality: string; bass?: string } {
  const slash = rest.lastIndexOf('/');
  if (slash < 0 || /^6\/9$/.test(rest.trim())) return { quality: rest };
  return { quality: rest.slice(0, slash), bass: rest.slice(slash + 1) };
}

/** Labels that mean "no chord here": a gap in the harmony. */
const NO_CHORD = /^(n\.?c\.?|%|-|—|)$/i;

export const isNoChord = (label: string) => NO_CHORD.test(label.trim());

/**
 * A hybrid degree label, the library's or a chart's: '♭6 dom7', '1 major/3',
 * '1 5' (a power chord). Null for a gap ('n.c.') and for text that is not a
 * chord ('c♯min7', a chart typo); `isNoChord` tells the two apart.
 */
export function parseDegreeChord(label: string): HarmonyChord | null {
  const m = /^\s*([b#♭♯]*[1-7])\s+(.*)$/.exec(label);
  if (!m) return null;
  const pc = degreeToPc(m[1]);
  if (pc === null) return null;
  const { quality, bass } = splitBass(m[2]);
  // Counted from the key, as the charts count it ('F/C' in F is '1 maj/5').
  return chordOf(pc, quality, bass ? degreeToPc(bass) : null);
}

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** 'B♭', 'F#', 'Cb' → pitch class; null when it is not a note name. */
export function noteToPc(note: string): number | null {
  const m = /^([A-G])([b#]*)$/.exec(ascii(note.trim()));
  if (!m) return null;
  let pc = LETTER_PC[m[1]];
  for (const sign of m[2]) pc += sign === 'b' ? -1 : 1;
  return ((pc % 12) + 12) % 12;
}

/**
 * A letter chord symbol in a key whose tonic is `tonicPc`: 'Am9' in A minor
 * is the tonic's min9; 'Bbmaj7/F' in F is the 4 maj7.
 */
export function parseLetterChord(
  symbol: string,
  tonicPc: number,
): HarmonyChord | null {
  const m = /^\s*([A-G](?:b|#|♭|♯)?)(.*)$/.exec(symbol);
  if (!m) return null;
  const root = noteToPc(m[1]);
  if (root === null) return null;
  // 'Cm' vs 'CM7': only the case-sensitive 'M7' means major.
  const { quality, bass } = splitBass(m[2]);
  const bassNote = bass ? noteToPc(bass) : null;
  return chordOf(
    (root - tonicPc + 12) % 12,
    quality,
    bassNote === null ? null : (bassNote - tonicPc + 12) % 12,
  );
}

/**
 * The tonic of a key as the app names keys: 'A minor (Dorian)', 'B♭ major',
 * 'F# minor'. Null when the text names no key.
 */
export function tonicOfKey(key: string): number | null {
  const m = /^\s*([A-G](?:b|#|♭|♯)?)/.exec(key);
  return m ? noteToPc(m[1]) : null;
}

/** Whether two chords are the same at a tier. */
export function sameAt(
  tier: MatchTier,
  a: HarmonyChord,
  b: HarmonyChord,
): boolean {
  if (a.pc !== b.pc) return false;
  if (tier === 'exact') return a.quality === b.quality && a.bassPc === b.bassPc;
  if (tier === 'family') return a.family === b.family;
  return (
    a.colour === b.colour || a.colour === 'either' || b.colour === 'either'
  );
}

/**
 * Whether a chart's chord plays a progression's chord at a tier. As `sameAt`,
 * except that a bass the progression asks for ('4 major/1', a pedal) is
 * asked of the chart at `family` too; only `loose` lets it go.
 */
export function playsAt(
  tier: MatchTier,
  chart: HarmonyChord,
  wanted: HarmonyChord,
): boolean {
  if (!sameAt(tier, chart, wanted)) return false;
  return (
    tier !== 'family' ||
    wanted.bassPc === undefined ||
    chart.bassPc === wanted.bassPc
  );
}

/** A chord's identity at a tier, for indexing; loose leaves 'either' open. */
export function keyAt(tier: MatchTier, chord: HarmonyChord): string {
  if (tier === 'exact')
    return `${chord.pc}:${chord.quality}/${chord.bassPc ?? ''}`;
  if (tier === 'family') return `${chord.pc}:${chord.family}`;
  return `${chord.pc}`;
}

const DEGREE_NAMES = [
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

const FAMILY_NAMES: Record<ChordFamily, string> = {
  maj: 'maj',
  dom: 'dom7',
  min: 'min',
  halfdim: 'min7(♭5)',
  dim: 'dim',
  aug: 'aug',
  sus: 'sus',
  power: '5',
};

/** A chord in hybrid numbering, by its family: '6 min', '5 dom7'. */
export const familyLabel = (chord: HarmonyChord) =>
  `${DEGREE_NAMES[chord.pc]} ${FAMILY_NAMES[chord.family]}`;
