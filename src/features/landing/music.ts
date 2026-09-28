import {
  abbreviateSequence,
  ALL_MODES,
  degreeMidi,
  generateChord,
  getChordColor,
  getModeOffset,
  getOptions,
  getScaleSpellings,
  KEY_COLORS,
  KEYS,
  MODE_DISPLAY,
  unstepChord,
  type ColorIndex,
} from '@prism/engine';
import {
  chordRgbFor,
  normalizeMode,
} from '@/curriculum/songLibrary/chordColor';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import type { Song } from '@/curriculum/types/songLibrary';

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

/** Display spellings (real ♭ / ♯) for the chord-root fallback. */
const NOTE_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;

const rgb = ([r, g, b]: readonly number[]) => `rgb(${r}, ${g}, ${b})`;

/** Pitch class (0–11) → its circle-of-fifths index (1 = C … 12 = F). */
const fifthsIndex = (pc: number) =>
  ((((((pc % 12) + 12) % 12) * 7) % 12) + 1) as ColorIndex;

/** Each key center's color name, in circle-of-fifths order (C → F). */
const COLOR_NAMES = [
  'Red',
  'Vermillion',
  'Orange',
  'Yellow',
  'Green',
  'Sage',
  'Teal',
  'Blue',
  'Indigo',
  'Purple',
  'Magenta',
  'Pink',
];

/** A major key's signature, fifths index 0 (C) … 11 (F): ♮, ♯ … ♯♯♯♯♯♯, ♭♭♭♭♭ … ♭. */
const signatureOf = (i: number) =>
  i === 0 ? '♮' : i <= 6 ? '♯'.repeat(i) : '♭'.repeat(12 - i);

/** The 12 key centers in circle-of-fifths order, each with its color. */
export const KEY_CENTERS = KEYS.slice(1).map((name, i) => ({
  name,
  pitchClass: (i * 7) % 12,
  color: rgb(KEY_COLORS[(i + 1) as ColorIndex]),
  colorName: COLOR_NAMES[i],
  signature: signatureOf(i),
}));

/** A major key center's color (the color the user's key selection receives). */
export const keyCenterColor = (tonicPc: number): string =>
  rgb(KEY_COLORS[fifthsIndex(tonicPc)]);

const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];

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
  /** Hybrid Number System name: degree + abbreviated quality, "3 maj". */
  hybrid: string;
  /** Studio chord-ruler label: letter root + abbreviated quality, "E maj". */
  label: string;
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
  const roman = acc + (lower ? base.toLowerCase() : base);
  return quality === 'diminished' ? `${roman}°` : roman;
};

/** "b7 major" → "♭7 maj". */
const toHybrid = (token: string) =>
  abbreviateSequence(token.replace(/^b/, '♭').replace(/^#/, '♯'));

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
    hybrid: toHybrid(token),
    label: `${spellRoot(token, keyRootMidi)} ${abbreviateSequence(quality)}`,
    midis: generateChord(chordRoot, quality),
    color: rgb(getChordColor(token, keyRootMidi, 'ionian')),
  };
};

/** Next-chord suggestions from the Prism progression graph (no slash chords). */
export const nextOptions = (sequence: string[]): string[] =>
  getOptions(2, sequence.join('|')).filter((t) => !t.includes('/'));

/**
 * The Studio tour's progression: I – III – IV – iv, a real path through the
 * Prism progression graph (degrees, so it follows the tour's key). In D major,
 * per `getChordColor`: D and G are diatonic → orange (key center); F♯ (III,
 * secondary-dominant area) → teal; Gm (iv, borrowed from D minor, whose parent
 * key is F) → pink.
 */
export const DEMO_PROGRESSION = ['1 major', '3 major', '4 major', '4 minor'];
/** Major-scale pitch classes for a tonic (all shown in the key-center color). */
export const majorScale = (tonicPc: number) =>
  [0, 2, 4, 5, 7, 9, 11].map((i) => (tonicPc + i) % 12);

/** The key center (name, pitch class, color) for a pitch class. */
export const keyCenterOf = (pc: number) =>
  KEY_CENTERS[((((pc % 12) + 12) % 12) * 7) % 12];

// ── Theory demo ───────────────────────────────────────────────────────────

/**
 * Tonic between F3 and E4, so a key's scale (up to its octave) and all seven
 * diatonic triads sit inside the demos' three-octave keys (C3–C6) in any key.
 */
const tonicMidi = (pc: number) => 53 + ((((pc - 5) % 12) + 12) % 12);

const DIATONIC_TRIADS = [
  '1 major',
  '2 minor',
  '3 minor',
  '4 major',
  '5 major',
  '6 minor',
  '7 diminished',
];

/** A major key's seven diatonic triads, 1 maj → 7 dim (all in the key's color). */
export const diatonicTriads = (tonicPc: number): DemoChord[] =>
  DIATONIC_TRIADS.map((t) => demoChord(t, tonicMidi(tonicPc)));

export interface DemoMode {
  mode: string;
  /** Display name, e.g. "Dorian". */
  name: string;
  /** Scale from the tonic up to its octave. */
  midis: number[];
  intervals: readonly number[];
  /** The major key whose notes the mode uses — it takes that key's color. */
  parent: (typeof KEY_CENTERS)[number];
}

/** The diatonic modes from brightest to darkest. */
const MODES_BRIGHT_TO_DARK = [
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
];

/**
 * The seven parallel modes of one root, brightest → darkest. Each takes the
 * color of its parent major key (C Dorian uses B♭ major's notes → B♭'s
 * color), so the colors walk one step around the circle of fifths.
 */
export const parallelModes = (tonicPc: number): DemoMode[] => {
  const tonic = tonicMidi(tonicPc);
  return MODES_BRIGHT_TO_DARK.map((mode) => {
    const intervals = ALL_MODES[mode];
    return {
      mode,
      name: MODE_DISPLAY[mode],
      midis: [...intervals.map((i) => tonic + i), tonic + 12],
      intervals,
      parent: keyCenterOf(tonicPc - getModeOffset(mode)),
    };
  });
};

// ── Songs demo ────────────────────────────────────────────────────────────

export interface SongChartHit {
  /** Chord as written in the song, e.g. "Cmin7". */
  name: string;
  /** The song's hybrid degree, e.g. "4 min7". */
  degree: string;
  /** Beat position in the bar (1-indexed) and length in beats. */
  beat: number;
  duration: number;
  /** Voiced for the demo keys (C3–B4). */
  midis: number[];
  color: string;
  /** Shares the key's color (diatonic), vs. borrowed from another key. */
  inKey: boolean;
}

export interface SongChartSection {
  label: string;
  /** Bars per chart row (the song's `measuresPerRow`, default 4). */
  perRow: number;
  /** Each bar's chords; an empty bar is a rest. */
  bars: SongChartHit[][];
}

/**
 * A chord for the demo keys: its root in the C3 octave under the chord tones
 * folded into C4–B4. Display/playback only — never color a chord from this
 * voicing (the engine reads the lowest note as the root).
 */
const voiceForKeys = (midis: number[]) =>
  midis.length === 0
    ? []
    : [
        48 + (midis[0] % 12),
        ...midis.map((m) => 60 + (m % 12)).sort((a, b) => a - b),
      ];

/** A song's key color: its parent major key's color (minor → relative major). */
export const songKeyColor = (song: Song) =>
  keyCenterOf(song.keyRoot - getModeOffset(normalizeMode(song.mode))).color;

/**
 * A song's chord chart for the Songs demo. Colors come from the song's chord
 * names in root position (`chordRgbFor`, the same as the app's chord chart).
 */
export const songDemoChart = (song: Song): SongChartSection[] => {
  const keyColor = songKeyColor(song);
  return song.sections.map((section) => ({
    label: section.label,
    perRow: section.measuresPerRow ?? 4,
    bars: section.bars.map((bar) =>
      bar.chords.map((hit) => {
        const color = rgb(
          chordRgbFor(hit.chordName, song.keyRoot, song.mode) ?? [
            232, 232, 240,
          ],
        );
        return {
          name: hit.chordName,
          degree: hit.degree,
          beat: hit.beat,
          duration: hit.duration,
          midis: voiceForKeys(chordNameToMidi(hit.chordName)),
          color,
          inKey: color === keyColor,
        };
      }),
    ),
  }));
};
