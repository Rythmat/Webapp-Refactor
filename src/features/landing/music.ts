import {
  degreeMidi,
  generateChord,
  getChordColor,
  getOptions,
  getScaleSpellings,
  KEY_COLORS,
  KEYS,
  unstepChord,
  type ColorIndex,
} from '@prism/engine';

/**
 * Landing demo music data, computed from the app's real Prism theory engine
 * (`@prism/engine`) — never hand-picked colors.
 *
 * Color rules (same as Studio / Learn):
 * - The user picks a key center; it takes that key's circle-of-fifths color
 *   (C = red, G = vermillion, D = orange … F = pink).
 * - Every diatonic chord in the key takes the key center's color.
 * - A chord from outside the key takes the color of the key center it is
 *   diatonic to, relative to the user's key (`getChordColor`): in C, Fm (iv,
 *   from C Aeolian → Eb) is purple, Bb (♭VII, C Mixolydian → F) is pink.
 * - A scale shows in ONE color — the key center's.
 *
 * The landing demos stay in major (Ionian) keys, so the key-center color is
 * always the color of the key the visitor sees selected.
 */

const NOTE_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

const rgb = ([r, g, b]: readonly number[]) => `rgb(${r}, ${g}, ${b})`;

/** Pitch class (0–11) → its circle-of-fifths index (1 = C … 12 = F). */
const fifthsIndex = (pc: number) =>
  ((((((pc % 12) + 12) % 12) * 7) % 12) + 1) as ColorIndex;

/** The 12 key centers in circle-of-fifths order, each with its color. */
export const KEY_CENTERS = KEYS.slice(1).map((name, i) => ({
  name,
  pitchClass: (i * 7) % 12,
  color: rgb(KEY_COLORS[(i + 1) as ColorIndex]),
}));

/** The four fixed scale-family colors (KEY_COLORS 13–16; they never rotate). */
export const SCALE_FAMILY_COLORS = [
  { name: 'Melodic minor', color: rgb(KEY_COLORS[13]) },
  { name: 'Harmonic minor', color: rgb(KEY_COLORS[14]) },
  { name: 'Harmonic major', color: rgb(KEY_COLORS[15]) },
  { name: 'Double harmonic', color: rgb(KEY_COLORS[16]) },
];

/** A major key center's color (the color the user's key selection receives). */
export const keyCenterColor = (tonicPc: number): string =>
  rgb(KEY_COLORS[fifthsIndex(tonicPc)]);

export const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];

const QUALITY_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  diminished: '°',
  augmented: '+',
  major7: 'maj7',
  minor7: 'm7',
  dominant7: '7',
  sus2: 'sus2',
  sus4: 'sus4',
  dominant7b5: '7♭5',
  minor7b5: 'm7♭5',
};

export interface DemoChord {
  /** Prism graph token, e.g. "3 major". */
  token: string;
  /** Display name in the demo key, e.g. "E". */
  name: string;
  /** Roman numeral, e.g. "III". */
  roman: string;
  midis: number[];
  /** `getChordColor` for this chord in the demo key. */
  color: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const toRoman = (token: string) => {
  const [deg, quality = ''] = token.split(' ');
  const acc = deg.startsWith('b') ? '♭' : deg.startsWith('#') ? '♯' : '';
  const n = Number(deg.replace(/[b#]/, ''));
  const base = ROMAN[n - 1] ?? '?';
  const lower = quality.startsWith('minor') || quality.startsWith('diminished');
  return acc + (lower ? base.toLowerCase() : base);
};

/**
 * Spell a chord root from its degree token in the key: the diatonic letter
 * from the engine's scale spelling, then the token's ♭/♯ (so ♯1° in C is C♯°,
 * not D♭°, and ♭5 is G♭).
 */
const spellRoot = (token: string, keyRootMidi: number) => {
  const deg = token.split(' ')[0];
  const mod = deg.startsWith('b') ? -1 : deg.startsWith('#') ? 1 : 0;
  const n = Number(deg.replace(/[b#]/, ''));
  const tonicPc = ((keyRootMidi % 12) + 12) % 12;
  const diatonicPc = (tonicPc + [0, 2, 4, 5, 7, 9, 11][n - 1]) % 12;
  const base = getScaleSpellings(tonicPc, 'ionian').get(diatonicPc);
  if (!base) return noteName(degreeMidi(keyRootMidi, token));
  const letter = base[0];
  const acc = base.slice(1);
  // Apply the modifier to the diatonic spelling's accidental.
  const count =
    (acc.match(/#/g)?.length ?? 0) - (acc.match(/b/g)?.length ?? 0) + mod;
  const accText =
    count > 0 ? '♯'.repeat(count) : count < 0 ? '♭'.repeat(-count) : '';
  return letter + accText;
};

/** Resolve a Prism graph token (e.g. "4 minor") to a playable, colored chord. */
export const demoChord = (token: string, keyRootMidi = 60): DemoChord => {
  const chordRoot = degreeMidi(keyRootMidi, token);
  const quality = unstepChord(token);
  return {
    token,
    name:
      spellRoot(token, keyRootMidi) +
      (QUALITY_SUFFIX[quality] ?? ` ${quality}`),
    roman: toRoman(token),
    midis: generateChord(chordRoot, quality),
    color: rgb(getChordColor(token, keyRootMidi, 'ionian')),
  };
};

/** Next-chord suggestions from the Prism progression graph (no slash chords). */
export const nextOptions = (sequence: string[]): string[] =>
  getOptions(2, sequence.join('|')).filter((t) => !t.includes('/'));

/** Demo key: C major (key center color = red). */
export const DEMO_KEY_ROOT = 60;

/**
 * The tour's progression in C major: I – III – IV – iv, a real path through
 * the Prism progression graph. Per `getChordColor`: C and F are diatonic →
 * red (key center); E (III, secondary-dominant area) → light green; Fm (iv,
 * borrowed from C minor, whose parent key is Eb) → purple.
 */
export const DEMO_PROGRESSION = ['1 major', '3 major', '4 major', '4 minor'];
export const DEMO_CHORDS = DEMO_PROGRESSION.map((t) =>
  demoChord(t, DEMO_KEY_ROOT),
);

/** Major-scale pitch classes for a tonic (all shown in the key-center color). */
export const majorScale = (tonicPc: number) =>
  [0, 2, 4, 5, 7, 9, 11].map((i) => (tonicPc + i) % 12);
