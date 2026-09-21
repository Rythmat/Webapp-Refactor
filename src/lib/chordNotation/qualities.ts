import { CHORDS } from '@prism/engine';
import { QUALITY_DISPLAY } from '@/daw/components/Library/insightConstants';

// ── Chord qualities ────────────────────────────────────────────────────────
// The app writes a chord's quality many ways: engine keys ("minor7b5"), hybrid
// abbreviations ("min7(♭5)"), lead-sheet and curriculum symbols ("m7b5", "ø7").
// normalizeQuality maps them all to the engine key; the tables below say how
// each key is written in jazz symbols (and, with case for minor, in Roman).

/** Qualities the app writes that the engine's CHORDS table doesn't list. */
const EXTRA_INTERVALS: Record<string, number[]> = {
  dominant11: [0, 4, 7, 10, 14, 17],
  minor11: [0, 3, 7, 10, 14, 17],
  add9: [0, 4, 7, 14],
  minoradd9: [0, 3, 7, 14],
  // Altered dominant: ♭9, ♯9, ♭13 over a dominant 7th.
  dominant7alt: [0, 4, 10, 13, 15, 20],
};

/** Intervals above the root for an engine quality key, if it's known. */
export const qualityIntervals = (quality: string): number[] | undefined =>
  CHORDS[quality] ?? EXTRA_INTERVALS[quality];

const MINUS = '−'; // −
const DELTA = 'Δ'; // Δ
const HALF_DIM = 'ø'; // ø
const DIM = '°'; // °
const FLAT = '♭'; // ♭
const SHARP = '♯'; // ♯

/** Jazz chord-symbol suffix per quality: the text after the root letter. */
const JAZZ_SUFFIX: Record<string, string> = {
  // Triads and dyads
  major: '',
  minor: MINUS,
  augmented: '+',
  diminished: DIM,
  sus2: 'sus2',
  sus4: 'sus4',
  quartal: 'quartal',
  '5': '5',
  major4: 'add4',
  minor4: `${MINUS}add4`,
  'sus#4': `sus${SHARP}4`,
  susb2: `sus${FLAT}2`,
  susb2b5: `sus${FLAT}2${FLAT}5`,
  sus2b5: `sus2${FLAT}5`,
  majorb5: `${FLAT}5`,
  Add2: 'add2',
  Add4: 'add4',
  add9: 'add9',
  minoradd9: `${MINUS}add9`,
  // 6ths
  major6: '6',
  minor6: `${MINUS}6`,
  major6add9: '6/9',
  minor6add9: `${MINUS}6/9`,
  // 7ths
  dominant7: '7',
  major7: `${DELTA}7`,
  minor7: `${MINUS}7`,
  diminished7: `${DIM}7`,
  minor7b5: `${HALF_DIM}7`,
  major7diminished: `${HALF_DIM}7`,
  minormajor7: `${MINUS}${DELTA}7`,
  diminishedmajor7: `${DIM}${DELTA}7`,
  'major7#5': `${DELTA}7${SHARP}5`,
  major7b5: `${DELTA}7${FLAT}5`,
  'minor7#5': `${MINUS}7${SHARP}5`,
  dominant7b5: `7${FLAT}5`,
  'dominant7#5': `7${SHARP}5`,
  dominant7sus2: '7sus2',
  dominant7sus4: '7sus4',
  major7sus2: `${DELTA}7sus2`,
  major7sus4: `${DELTA}7sus4`,
  dominant7b9: `7${FLAT}9`,
  'dominant7#9': `7${SHARP}9`,
  'dominant7#11': `7${SHARP}11`,
  'b7dominant7#11': `7${SHARP}11`,
  dominant7alt: '7alt',
  'major7#11': `${DELTA}7${SHARP}11`,
  'major7#9': `${DELTA}7${SHARP}9`,
  'dominant7#5b9': `7${SHARP}5${FLAT}9`,
  'dominant7#5#9': `7${SHARP}5${SHARP}9`,
  'major7#5#9': `${DELTA}7${SHARP}5${SHARP}9`,
  // 9ths, 11ths, 13ths
  dominant9: '9',
  major9: `${DELTA}9`,
  minor9: `${MINUS}9`,
  minor7b9: `${MINUS}7${FLAT}9`,
  minormajor9: `${MINUS}${DELTA}9`,
  'major9#5': `${DELTA}9${SHARP}5`,
  diminished7b9: `${DIM}7${FLAT}9`,
  minor7b5b9: `${HALF_DIM}7${FLAT}9`,
  'dominant9#5': `9${SHARP}5`,
  minor9b5: `${HALF_DIM}9`,
  sus2b5add6: `sus2${FLAT}5add6`,
  dominant11: '11',
  minor11: `${MINUS}11`,
  dominant13: '13',
  major13: `${DELTA}13`,
  minor13: `${MINUS}13`,
};

/** Symbols as lead sheets, curriculum data and games write them (case matters: M7 ≠ m7). */
const SYMBOLS: Record<string, string> = {
  '': 'major',
  M: 'major',
  maj: 'major',
  Maj: 'major',
  m: 'minor',
  mi: 'minor',
  '-': 'minor',
  [MINUS]: 'minor',
  '7': 'dominant7',
  dom: 'dominant7',
  M7: 'major7',
  Maj7: 'major7',
  ma7: 'major7',
  [DELTA]: 'major7',
  [`${DELTA}7`]: 'major7',
  m7: 'minor7',
  mi7: 'minor7',
  '-7': 'minor7',
  [`${MINUS}7`]: 'minor7',
  m7b5: 'minor7b5',
  '-7b5': 'minor7b5',
  [`${MINUS}7b5`]: 'minor7b5',
  [HALF_DIM]: 'minor7b5',
  [`${HALF_DIM}7`]: 'minor7b5',
  [DIM]: 'diminished',
  o: 'diminished',
  [`${DIM}7`]: 'diminished7',
  o7: 'diminished7',
  '+': 'augmented',
  '6': 'major6',
  m6: 'minor6',
  '-6': 'minor6',
  [`${MINUS}6`]: 'minor6',
  '9': 'dominant9',
  M9: 'major9',
  [`${DELTA}9`]: 'major9',
  m9: 'minor9',
  '-9': 'minor9',
  [`${MINUS}9`]: 'minor9',
  '11': 'dominant11',
  m11: 'minor11',
  '-11': 'minor11',
  [`${MINUS}11`]: 'minor11',
  '13': 'dominant13',
  M13: 'major13',
  [`${DELTA}13`]: 'major13',
  m13: 'minor13',
  '-13': 'minor13',
  [`${MINUS}13`]: 'minor13',
  sus: 'sus4',
  '7sus': 'dominant7sus4',
  '7sus4': 'dominant7sus4',
  '7sus2': 'dominant7sus2',
  '7b9': 'dominant7b9',
  '7#9': 'dominant7#9',
  '7b5': 'dominant7b5',
  '7#5': 'dominant7#5',
  '+7': 'dominant7#5',
  '7#11': 'dominant7#11',
  '7aug': 'dominant7#5',
  aug7: 'dominant7#5',
  '7alt': 'dominant7alt',
  alt: 'dominant7alt',
  alt7: 'dominant7alt',
  '#5': 'augmented',
  sus7: 'dominant7sus4',
  m7b9: 'minor7b9',
  mMaj7: 'minormajor7',
  mM7: 'minormajor7',
  'm(maj7)': 'minormajor7',
  [`m${DELTA}7`]: 'minormajor7',
  [`-${DELTA}7`]: 'minormajor7',
  [`${MINUS}${DELTA}7`]: 'minormajor7',
  '6/9': 'major6add9',
  'm6/9': 'minor6add9',
  '69': 'major6add9',
  maj69: 'major6add9',
  m69: 'minor6add9',
  min69: 'minor6add9',
  madd9: 'minoradd9',
  add9: 'add9',
  add2: 'Add2',
  add4: 'Add4',
  'maj7#11': 'major7#11',
  [`${DELTA}7#11`]: 'major7#11',
};

const ascii = (s: string) => s.replace(/♭/g, 'b').replace(/♯/g, '#');

/** Lower-case, ASCII, no parentheses, words shortened: "Min7(♭5)" → "min7b5". */
const compact = (s: string) =>
  ascii(s)
    .toLowerCase()
    .replace(/[()\s]/g, '')
    .replace(/dominant/g, 'dom')
    .replace(/diminished/g, 'dim')
    .replace(/augmented/g, 'aug')
    .replace(/minor/g, 'min')
    .replace(/major/g, 'maj');

const COMPACT_INDEX = new Map<string, string>();
for (const key of [...Object.keys(CHORDS), ...Object.keys(EXTRA_INTERVALS)]) {
  if (!COMPACT_INDEX.has(compact(key))) COMPACT_INDEX.set(compact(key), key);
}
for (const [key, display] of Object.entries(QUALITY_DISPLAY)) {
  if (!COMPACT_INDEX.has(compact(display))) {
    COMPACT_INDEX.set(compact(display), key);
  }
}

/**
 * The engine quality key for any way the app writes a quality: "minor7",
 * "min7", "m7", "−7", "Minor" → "minor7"/"minor". Unrecognized text comes back
 * trimmed but otherwise unchanged.
 */
export function normalizeQuality(raw: string): string {
  const token = raw.trim();
  if (qualityIntervals(token)) return token;
  // Song charts parenthesize alterations: "7(♯9)", "(♯5)".
  const symbol =
    SYMBOLS[token] ??
    SYMBOLS[ascii(token)] ??
    SYMBOLS[ascii(token).replace(/[()]/g, '')];
  if (symbol) return symbol;
  return COMPACT_INDEX.get(compact(token)) ?? token;
}

/** An engine slash quality ("major/5") without its bass designation. */
export const baseQuality = (quality: string) =>
  quality.includes('/') && CHORDS[quality]
    ? quality.slice(0, quality.indexOf('/'))
    : quality;

/** The jazz symbol suffix for an engine quality key, if it has one. */
export const jazzSuffix = (quality: string): string | undefined =>
  JAZZ_SUFFIX[baseQuality(quality)];

/**
 * Whether a quality's third is minor (so Roman numerals are lower case):
 * minor, diminished and half-diminished chords, but not sus or power chords.
 */
export function isMinorQuality(quality: string): boolean {
  const intervals = qualityIntervals(baseQuality(quality));
  if (intervals) {
    const pcs = new Set(intervals.map((i) => ((i % 12) + 12) % 12));
    return pcs.has(3) && !pcs.has(4);
  }
  return /^(m(?!aj)|min|dim|-|−|ø|°)/i.test(quality);
}
