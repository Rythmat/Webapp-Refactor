import { parseDegreeChord } from '@/content/harmony/chordClass';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import { filterByVibeAndStyle } from '@/curriculum/engine/algorithmFilter';
import { pickOne, type EchoRandom } from '@/curriculum/engine/echo/random';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import {
  KEY_NOTE_NAMES,
  MIDI_ROOT_TO_KEY,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { PromptMode } from './parseMusicPrompt';
import type { PromptPlan } from './planPrompt';

// ── A progression for the prompt (owner, 2026-10-23) ───────────────────────
//
// The words the prompt's moods and style were read as are the progression
// library's own tags (chordProgressionLibrary.ts vibes / styles, filtered by
// algorithmFilter.ts), so the library answers them: "sad" finds what it
// tags melancholic, "jazz" what it tags jazz. The library writes its loops in
// major-key degrees, so a mode is read through its parent major (D Dorian is
// C major's 2): a loop for it starts on the mode's own tonic chord, rotated
// there when the tonic comes later in it.

export interface PickedProgression {
  /** The library's id; null for a built-in loop. */
  id: number | null;
  /** The degree chords as the library writes them, rotated to the tonic. */
  degrees: string[];
  /** One chord symbol per bar, spelled in the prompt's key. */
  chords: string[];
}

/** Where each mode's tonic sits in its parent major, in semitones. */
const MODE_SHIFT: Record<PromptMode, number> = {
  ionian: 0,
  dorian: 2,
  phrygian: 4,
  lydian: 5,
  mixolydian: 7,
  aeolian: 9,
};

/** The parent major of a tonic in a mode, as a pitch class. */
export const parentOf = (tonicPc: number, mode: PromptMode): number =>
  (((tonicPc - MODE_SHIFT[mode]) % 12) + 12) % 12;

/** Whether a mode's tonic chord is minor (its third is). */
const minorMode = (mode: PromptMode) =>
  mode === 'dorian' || mode === 'phrygian' || mode === 'aeolian';

/** The ASCII suffix the band engine reads (chordSymbolTones) per quality. */
const SUFFIX: Record<string, string> = {
  maj: '',
  min: 'm',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  dom7sus4: '7sus4',
  'dom7#5': '7#5',
  dom7b5: '7b5',
  'dom7#11': '7#11',
  dom7b9: '7b9',
  'maj7#11': 'maj7#11',
  min6: 'm6',
  maj6: '6',
  min7b5: 'm7b5',
  minmaj7: 'mmaj7',
  dim: 'dim',
  dim7: 'dim7',
  sus4: 'sus4',
  sus2: 'sus2',
  aug: 'aug',
  dom9: '9',
  maj9: 'maj9',
  min9: 'm9',
};

/** A note's name in a major key's own spelling, without double letters. */
function noteName(parentPc: number, pc: number): string {
  const key = MIDI_ROOT_TO_KEY[parentPc as keyof typeof MIDI_ROOT_TO_KEY];
  const names = KEY_NOTE_NAMES[key as keyof typeof KEY_NOTE_NAMES];
  const name = names?.[(((pc % 12) + 12) % 12) as number] ?? 'C';
  return (
    ({ Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' } as Record<string, string>)[
      name
    ] ?? name
  );
}

const TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};
const TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** How a tonic's own name says to spell its key: Ab flats, F# sharps. */
const accidentalsOf = (tonicLabel: string): 'flats' | 'sharps' | null =>
  /b$/.test(tonicLabel) ? 'flats' : /#$/.test(tonicLabel) ? 'sharps' : null;

/**
 * Degree chords ('2 minor7', '5 dominant7', '1 major/3') as chord symbols in
 * the major key on `parentPc` ('Dm7', 'G7', 'C/E'); null when one can't be
 * written or the band engine wouldn't read it.
 */
export function chordsInKey(
  degrees: readonly string[],
  parentPc: number,
  /** Spell the key's way: 'flats' for A♭ minor (A♭m7, not G♯m7). */
  accidentals: 'flats' | 'sharps' | null = null,
): string[] | null {
  const out: string[] = [];
  const spell = (name: string) =>
    accidentals === 'flats'
      ? (TO_FLAT[name] ?? name)
      : accidentals === 'sharps'
        ? (TO_SHARP[name] ?? name)
        : name;
  for (const label of degrees) {
    const chord = parseDegreeChord(label);
    if (!chord) return null;
    const suffix = SUFFIX[chord.quality];
    if (suffix === undefined) return null;
    const root = spell(noteName(parentPc, parentPc + chord.pc));
    const bass =
      chord.bassPc !== undefined && chord.bassPc !== chord.pc
        ? `/${spell(noteName(parentPc, parentPc + chord.bassPc))}`
        : '';
    const symbol = `${root}${suffix}${bass}`;
    if (!chordSymbolTones(symbol)) return null;
    out.push(symbol);
  }
  return out;
}

/** The loop rotated to start on the mode's tonic chord; null when it can't. */
function onTonic(
  degrees: readonly string[],
  mode: PromptMode,
): string[] | null {
  const tonic = MODE_SHIFT[mode];
  const at = degrees.findIndex((label) => {
    const chord = parseDegreeChord(label);
    if (!chord || chord.pc !== tonic) return false;
    return minorMode(mode)
      ? chord.family === 'min'
      : chord.family === 'maj' || chord.family === 'dom';
  });
  if (at < 0) return null;
  return [...degrees.slice(at), ...degrees.slice(0, at)];
}

/**
 * A bridge's loop: it leaves home, so it starts off the tonic chord — on
 * IV, vi, ii, ♭VI, ♭III or ♭VII, the first of those the loop has, else any
 * chord but the tonic. Null for a loop of the tonic alone.
 */
function offTonic(
  degrees: readonly string[],
  mode: PromptMode,
): string[] | null {
  const tonic = MODE_SHIFT[mode];
  const from = (label: string) => {
    const chord = parseDegreeChord(label);
    return chord ? (((chord.pc - tonic) % 12) + 12) % 12 : null;
  };
  const preferred = [5, 9, 2, 8, 3, 10];
  let at = -1;
  for (const step of preferred) {
    at = degrees.findIndex((label) => from(label) === step);
    if (at >= 0) break;
  }
  if (at < 0) at = degrees.findIndex((label) => from(label) !== 0);
  if (at < 0) return null;
  return [...degrees.slice(at), ...degrees.slice(0, at)];
}

/** A loop that fills sixteen bars evenly: 2, 4 or 8 chords (3 padded to 4). */
function evenLoop(degrees: string[]): string[] | null {
  if (degrees.length === 3) return [...degrees, degrees[2]];
  return [2, 4, 8].includes(degrees.length) ? degrees : null;
}

/** Each mode's own loop, for when the library has nothing that fits. */
const BUILT_IN: Record<PromptMode, string[]> = {
  ionian: ['1 major', '5 major', '6 minor', '4 major'],
  aeolian: ['6 minor', '4 major', '1 major', '5 major'],
  dorian: ['2 minor7', '5 dominant7'],
  mixolydian: ['5 dominant7', '4 major', '1 major', '5 dominant7'],
  lydian: ['4 major7', '5 major'],
  phrygian: ['3 minor', '4 major'],
};

/** A 12-bar blues on the tonic: I7 ×4, IV7 ×2, I7 ×2, V7, IV7, I7, V7. */
const TWELVE_BAR = [
  '1 dominant7',
  '1 dominant7',
  '1 dominant7',
  '1 dominant7',
  '4 dominant7',
  '4 dominant7',
  '1 dominant7',
  '1 dominant7',
  '5 dominant7',
  '4 dominant7',
  '1 dominant7',
  '5 dominant7',
];

/** A library loop, made ready for the prompt's mode and key; null if it isn't. */
function prepare(
  entry: ChordProgressionEntry,
  plan: PromptPlan,
  role: string | null,
): PickedProgression | null {
  const rotated =
    role === 'bridge'
      ? offTonic(entry.chords, plan.mode)
      : onTonic(entry.chords, plan.mode);
  const loop = rotated && evenLoop(rotated);
  const chords =
    loop &&
    chordsInKey(
      loop,
      parentOf(plan.tonicPc, plan.mode),
      accidentalsOf(plan.tonicLabel),
    );
  return chords ? { id: entry.id, degrees: loop!, chords } : null;
}

/** What a progression has to stand apart from, and the part it plays. */
export interface PickOptions {
  /**
   * The song's other progressions (its other sections', as chord symbols):
   * the pick shares as few chords with each as the tier allows, and never
   * repeats one.
   */
  avoid?: readonly (readonly string[])[];
  /** The section it's for ('bridge', 'chorus'…): a bridge leaves home. */
  role?: string | null;
}

/** A chord as a sound, whatever its spelling: root pitch class and tones. */
function chordKey(symbol: string): string {
  const tones = chordSymbolTones(symbol);
  return tones ? `${tones.rootPc}:${tones.intervals.join(',')}` : symbol;
}

/** How much of `chords` another progression already plays, 0–1. */
function overlap(chords: readonly string[], other: readonly string[]): number {
  const theirs = new Set(other.map(chordKey));
  const mine = [...new Set(chords.map(chordKey))];
  if (!mine.length) return 0;
  return mine.filter((c) => theirs.has(c)).length / mine.length;
}

/** Whether two progressions are the same loop (a rotation counts). */
function sameLoop(a: readonly string[], b: readonly string[]): boolean {
  const ka = a.map(chordKey);
  const kb = [...new Set(b.map(chordKey))];
  const ua = [...new Set(ka)];
  return ua.length === kb.length && ua.every((c) => kb.includes(c));
}

/**
 * The candidates that stand apart from the song's other progressions: none
 * that repeats one, and of the rest those sharing the fewest chords with
 * the one they're closest to.
 */
function contrasting(
  ready: PickedProgression[],
  avoid: readonly (readonly string[])[],
): PickedProgression[] {
  if (!avoid.length) return ready;
  const fresh = ready.filter((p) => !avoid.some((a) => sameLoop(p.chords, a)));
  if (!fresh.length) return [];
  const score = (p: PickedProgression) =>
    Math.max(...avoid.map((a) => overlap(p.chords, a)));
  const best = Math.min(...fresh.map(score));
  return fresh.filter((p) => score(p) === best);
}

/**
 * The prompt's progression: the library's loops for its style and moods at
 * its complexity, widening tier by tier until one fits the mode and key
 * (and stands apart from the song's other progressions), then the mode's
 * built-in loop. `skip` leaves out loops already tried.
 */
export function pickProgression(
  library: readonly ChordProgressionEntry[],
  plan: PromptPlan,
  rng: EchoRandom,
  skip: ReadonlySet<number> = new Set(),
  { avoid = [], role = null }: PickOptions = {},
): PickedProgression {
  if (plan.prompt.form === '12-bar') {
    return {
      id: null,
      degrees: TWELVE_BAR,
      // The blues' I is the tonic itself: spelled in the tonic's major.
      chords: chordsInKey(
        TWELVE_BAR,
        plan.tonicPc,
        accidentalsOf(plan.tonicLabel),
      )!,
    };
  }

  const all = library.filter((e) => !skip.has(e.id));
  const byVibe = (entries: ChordProgressionEntry[], style?: boolean) => {
    const out: ChordProgressionEntry[] = [];
    for (const vibe of plan.vibes) {
      for (const e of filterByVibeAndStyle(
        entries,
        vibe,
        style ? plan.styleTag : undefined,
      ))
        if (!out.includes(e)) out.push(e);
    }
    return out;
  };
  const styled = filterByVibeAndStyle(all, undefined, plan.styleTag);
  const ofComplexity = (entries: ChordProgressionEntry[]) =>
    entries.filter((e) => e.complexity === plan.complexity);

  const tiers: (() => ChordProgressionEntry[])[] = [
    () => ofComplexity(byVibe(all, true)),
    () => byVibe(all, true),
    () => ofComplexity(styled),
    () => ofComplexity(byVibe(all)),
    () => styled,
    () => byVibe(all),
    () => ofComplexity(all),
  ];
  for (const tier of tiers) {
    const ready = contrasting(
      tier()
        .map((e) => prepare(e, plan, role))
        .filter((p): p is PickedProgression => p !== null),
      avoid,
    );
    if (ready.length) return pickOne(rng, ready);
  }

  const own = BUILT_IN[plan.mode];
  const degrees = (role === 'bridge' ? offTonic(own, plan.mode) : null) ?? own;
  return {
    id: null,
    degrees,
    chords: chordsInKey(
      degrees,
      parentOf(plan.tonicPc, plan.mode),
      accidentalsOf(plan.tonicLabel),
    )!,
  };
}
