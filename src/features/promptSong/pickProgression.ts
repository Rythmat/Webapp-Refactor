import { parseDegreeChord } from '@/content/harmony/chordClass';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import { filterByVibeAndStyle } from '@/curriculum/engine/algorithmFilter';
import {
  holdsFor,
  PHRASE_HOLDS,
  pushed,
  timedHolds,
  type StyleHarmony,
} from '@/curriculum/engine/band/harmonicRhythm';
import {
  pickOne,
  pickWeighted,
  type EchoRandom,
} from '@/curriculum/engine/echo/random';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import type { TimedChords } from '@/curriculum/engine/genreGeneration/chordTimeline';
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
//
// A loop is played as an eight-bar phrase (owner, 2026-11-10: Prism wrote
// four bars and they ground): a loop of up to four chords is the phrase's
// first half, and its second half answers it, with another of the pool's
// loops that opens on the same chord, or with the loop again turning round
// to its start in the last bar. A loop of five to seven chords holds some
// of them two bars, to fill the eight. The phrase comes back timed
// (`timed`), for the band engine's `timedChords`.

export interface PickedProgression {
  /** The library's id; null for a built-in loop. */
  id: number | null;
  /** The degree chords as the library writes them, rotated to the tonic. */
  degrees: string[];
  /** The phrase's chords in the order they change, spelled in the key. */
  chords: string[];
  /** The phrase, timed: its changes, repeated every `length` ticks. */
  timed: TimedChords;
  /** How early its changes arrive, in ticks (a band style's push). */
  push?: number;
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

/** A bar of 4/4 in ticks: prompts write in 4/4 alone (buildPromptPart). */
const BAR = 1920;

/** The bars a phrase lasts. */
export const PHRASE_BARS = 8;

/** Bars each chord of a longer loop holds (harmonicRhythm.ts PHRASE_HOLDS). */
const HARMONIC_RHYTHM = PHRASE_HOLDS;

/**
 * A loop the library writes, as it loops: a phrase that ends by landing back
 * on its first chord lists the landing as a chord of its own (an odd-length
 * one; buildGenrePracticeTrack's `loopChords` reads it the same way), and
 * three chords are padded to four, the last held two bars. Null for a loop
 * too short or too long to be a phrase.
 */
function asLoop(degrees: readonly string[]): string[] | null {
  let loop = [...degrees];
  if (loop.length > 2 && loop.length % 2 === 1 && loop.at(-1) === loop[0])
    loop = loop.slice(0, -1);
  if (loop.length === 3) loop.push(loop[2]);
  return loop.length >= 2 && loop.length <= 8 ? loop : null;
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

/**
 * Chords that turn a phrase round to its start, best first, in the parent
 * major's degrees as the mode has them: Ionian's V7, IV, ii7; Lydian's V,
 * II7; Mixolydian's ♭VII, IV, v7; Aeolian's ♭VII7 (G7 in A minor), ♭VI,
 * iv7, v7; Dorian's ♭VII, IV7, v7; Phrygian's ♭II, ♭vii7. A phrase turns on
 * the first that isn't its last chord or its first.
 */
const TURNAROUNDS: Record<PromptMode, readonly string[]> = {
  ionian: ['5 dominant7', '4 major7', '2 minor7'],
  lydian: ['1 major7', '5 dominant7'],
  mixolydian: ['4 major7', '1 major7', '2 minor7'],
  aeolian: ['5 dominant7', '4 major7', '2 minor7', '3 minor7'],
  dorian: ['1 major7', '5 dominant7', '6 minor7'],
  phrygian: ['4 major7', '2 minor7'],
};

/** A seventh chord's triad, for a plan of triads ('5 dominant7' → '5 major'). */
const triadOf = (label: string) =>
  label.replace(/dominant7|major7/, 'major').replace('minor7', 'minor');

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

/** Chords held a number of bars each, as changes timed from the downbeat. */
function timedOf(held: readonly (readonly [string, number])[]): TimedChords {
  const changes: { tick: number; symbol: string }[] = [];
  let tick = 0;
  for (const [symbol, bars] of held) {
    if (changes.at(-1)?.symbol !== symbol) changes.push({ tick, symbol });
    tick += Math.round(bars * BAR);
  }
  return { changes, length: tick };
}

/** One chord a bar, as the loop is written. */
const perBar = (chords: readonly string[]): TimedChords =>
  timedOf(chords.map((c) => [c, 1] as const));

/** The symbols a timed phrase changes through, in order. */
const changesOf = (timed: TimedChords) => timed.changes.map((c) => c.symbol);

/** A library loop, made ready for the prompt's mode and key; null if it isn't. */
function prepare(
  entry: ChordProgressionEntry,
  plan: PromptPlan,
  role: string | null,
): PickedProgression | null {
  const own = asLoop(entry.chords);
  const rotated =
    own &&
    (role === 'bridge' ? offTonic(own, plan.mode) : onTonic(own, plan.mode));
  const chords =
    rotated &&
    chordsInKey(
      rotated,
      parentOf(plan.tonicPc, plan.mode),
      accidentalsOf(plan.tonicLabel),
    );
  return chords
    ? { id: entry.id, degrees: rotated!, chords, timed: perBar(chords) }
    : null;
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
  /**
   * Loops the session played lately: left out while others fit, so asking
   * again brings new chords.
   */
  recent?: ReadonlySet<number>;
  /** How the band style playing it changes chords (harmonicRhythm.ts). */
  harmony?: StyleHarmony;
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

/** How far over the least overlap a candidate may be and still stand apart. */
const CONTRAST_SLACK = 0.25;

/**
 * The candidates that stand apart from the song's other progressions: none
 * that repeats one, and of the rest those sharing about the fewest chords
 * with the one they're closest to.
 */
function contrasting<T extends { p: PickedProgression }>(
  ready: T[],
  avoid: readonly (readonly string[])[],
): T[] {
  if (!avoid.length) return ready;
  const fresh = ready.filter(
    ({ p }) => !avoid.some((a) => sameLoop(p.chords, a)),
  );
  if (!fresh.length) return [];
  const score = ({ p }: T) =>
    Math.max(...avoid.map((a) => overlap(p.chords, a)));
  const best = Math.min(...fresh.map(score));
  return fresh.filter((c) => score(c) <= best + CONTRAST_SLACK);
}

/** The chord turning a loop round to its start, after `last`; null if none does. */
function turnaroundFor(
  loop: readonly string[],
  last: string,
  plan: PromptPlan,
): string | null {
  const rootOf = (symbol: string) => chordSymbolTones(symbol)?.rootPc;
  return (
    TURNAROUNDS[plan.mode]
      .map(
        (label) =>
          chordsInKey(
            [plan.complexity === 'triad' ? triadOf(label) : label],
            parentOf(plan.tonicPc, plan.mode),
            accidentalsOf(plan.tonicLabel),
          )?.[0],
      )
      .find(
        (symbol): symbol is string =>
          !!symbol &&
          rootOf(symbol) !== rootOf(last) &&
          rootOf(symbol) !== rootOf(loop[0]),
      ) ?? null
  );
}

/** The pool's loops that can answer `loop`: same opening, another chord shared. */
function answersTo(
  picked: PickedProgression,
  pool: readonly PickedProgression[],
  fits: (p: PickedProgression) => boolean,
): PickedProgression[] {
  const loop = picked.chords;
  const opening = chordKey(loop[0]);
  return pool.filter(
    (p) =>
      p.id !== picked.id &&
      fits(p) &&
      chordKey(p.chords[0]) === opening &&
      !sameLoop(p.chords, loop) &&
      overlap(p.chords, loop) * new Set(p.chords.map(chordKey)).size >= 2,
  );
}

/**
 * The phrase a loop plays (the header's PHRASE): five chords or more held
 * over eight bars; up to four, a first half and an answer — one of `pool`'s
 * loops that opens on the same chord and shares another with it, or the
 * loop again with its last bar turning round to the start. In a band
 * style's harmony (`harmony`, harmonicRhythm.ts) its chords are held as the
 * style holds them, its last pass is the answer, and its changes are pushed
 * as the style pushes them.
 */
export function phraseOf(
  picked: PickedProgression,
  pool: readonly PickedProgression[],
  plan: PromptPlan,
  rng: EchoRandom,
  harmony?: StyleHarmony,
): PickedProgression {
  if (harmony) return styledPhrase(picked, pool, plan, rng, harmony);
  const loop = picked.chords;
  const rhythm = HARMONIC_RHYTHM[loop.length];
  if (rhythm) {
    const timed = timedOf(loop.map((c, i) => [c, rhythm[i]] as const));
    return { ...picked, chords: changesOf(timed), timed };
  }
  // The first half: the loop over four bars (a two-chord vamp twice).
  const half = Array.from({ length: 4 }, (_, i) => loop[i % loop.length]);
  const answers = answersTo(picked, pool, (p) => p.chords.length <= 4);
  let answer: (readonly [string, number])[];
  if (answers.length && rng() < 0.5) {
    const other = pickOne(rng, answers).chords;
    answer = Array.from(
      { length: 4 },
      (_, i) => [other[i % other.length], 1] as const,
    );
  } else {
    const last = half[3];
    const turn = turnaroundFor(loop, last, plan);
    answer = [
      ...half.slice(0, 3).map((c) => [c, 1] as const),
      ...(turn
        ? ([
            [last, 0.5],
            [turn, 0.5],
          ] as const)
        : ([[last, 1]] as const)),
    ];
  }
  const timed = timedOf([...half.map((c) => [c, 1] as const), ...answer]);
  return { ...picked, chords: changesOf(timed), timed };
}

/**
 * A loop's phrase in a band style's harmony: the loop held as the style
 * holds it, passes enough to fill the phrase when they go into it evenly,
 * the last pass answered (another loop as long, held the same, or the loop
 * turning round in its last chord's second half), every change pushed.
 */
function styledPhrase(
  picked: PickedProgression,
  pool: readonly PickedProgression[],
  plan: PromptPlan,
  rng: EchoRandom,
  harmony: StyleHarmony,
): PickedProgression {
  const loop = picked.chords;
  const holds = holdsFor(loop.length, harmony);
  const pass = holds.reduce((a, b) => a + b, 0);
  const phrase = PHRASE_BARS * 4;
  const passes = pass < phrase && phrase % pass === 0 ? phrase / pass : 1;
  const held: [string, number][] = [];
  for (let p = 0; p < passes - 1; p++)
    loop.forEach((c, i) => held.push([c, holds[i]]));
  const answers =
    passes > 1
      ? answersTo(picked, pool, (p) => p.chords.length === loop.length)
      : [];
  if (answers.length && rng() < 0.5) {
    pickOne(rng, answers).chords.forEach((c, i) => held.push([c, holds[i]]));
  } else {
    loop.forEach((c, i) => held.push([c, holds[i]]));
    const last = held.at(-1)!;
    const turn = passes > 1 ? turnaroundFor(loop, last[0], plan) : null;
    // Half the last chord's hold, a beat at the least.
    if (turn && last[1] >= 2) {
      const half = last[1] / 2;
      held.splice(-1, 1, [last[0], half], [turn, half]);
    }
  }
  const timed = pushed(timedHolds(held), harmony.push);
  return {
    ...picked,
    chords: changesOf(timed),
    timed,
    ...(harmony.push ? { push: harmony.push } : {}),
  };
}

/**
 * The library's loops of each style, read once a library: the style tags'
 * algorithms read every loop (about 10ms a style), and a pick asks often.
 */
const STYLE_IDS = new WeakMap<object, Map<string, Set<number>>>();

function styleIds(
  library: readonly ChordProgressionEntry[],
  styleTag: PromptPlan['styleTag'],
): Set<number> {
  let byStyle = STYLE_IDS.get(library);
  if (!byStyle) STYLE_IDS.set(library, (byStyle = new Map()));
  let ids = byStyle.get(styleTag);
  if (!ids) {
    ids = new Set(
      filterByVibeAndStyle([...library], undefined, styleTag).map((e) => e.id),
    );
    byStyle.set(styleTag, ids);
  }
  return ids;
}

/** How many candidates the pool gathers before it stops widening. */
const MIN_POOL = 12;

/** Weights of the tiers that bring candidates, in the order they bring them. */
const TIER_WEIGHTS = [3, 2, 1];

/** A complexity the style has loops at: the plan's, else the nearest. */
function complexityFor(
  entries: readonly ChordProgressionEntry[],
  wanted: PromptPlan['complexity'],
): PromptPlan['complexity'] {
  const order: PromptPlan['complexity'][] = ['triad', '7th', 'extended'];
  const at = order.indexOf(wanted);
  const nearest = [...order].sort(
    (a, b) => Math.abs(order.indexOf(a) - at) - Math.abs(order.indexOf(b) - at),
  );
  return nearest.find((c) => entries.some((e) => e.complexity === c)) ?? wanted;
}

/**
 * The prompt's progression: the library's loops for its style and moods
 * at its complexity, widening tier by tier until the pool holds a dozen
 * that fit the mode and key (and stand apart from the song's other
 * progressions), the closer tiers likelier; then the mode's built-in loop.
 * Played as an eight-bar phrase (`phraseOf`). `skip` leaves out loops
 * already tried.
 */
export function pickProgression(
  library: readonly ChordProgressionEntry[],
  plan: PromptPlan,
  rng: EchoRandom,
  skip: ReadonlySet<number> = new Set(),
  { avoid = [], role = null, recent, harmony }: PickOptions = {},
): PickedProgression {
  if (plan.prompt.form === '12-bar') {
    // The blues' I is the tonic itself: spelled in the tonic's major.
    const chords = chordsInKey(
      TWELVE_BAR,
      plan.tonicPc,
      accidentalsOf(plan.tonicLabel),
    )!;
    return { id: null, degrees: TWELVE_BAR, chords, timed: perBar(chords) };
  }

  const all = library.filter((e) => !skip.has(e.id));
  const ofStyle = styleIds(library, plan.styleTag);
  const styled = all.filter((e) => ofStyle.has(e.id));
  const byVibe = (entries: ChordProgressionEntry[]) => {
    const out: ChordProgressionEntry[] = [];
    for (const vibe of plan.vibes) {
      for (const e of filterByVibeAndStyle(entries, vibe))
        if (!out.includes(e)) out.push(e);
    }
    return out;
  };
  // Latin and blues have no triads: their loops at the nearest richness.
  const complexity = complexityFor(styled, plan.complexity);
  const ofComplexity = (entries: ChordProgressionEntry[]) =>
    entries.filter((e) => e.complexity === complexity);

  const tiers: (() => ChordProgressionEntry[])[] = [
    () => ofComplexity(byVibe(styled)),
    () => byVibe(styled),
    () => ofComplexity(styled),
    () => ofComplexity(byVibe(all)),
    () => styled,
    () => byVibe(all),
    () => ofComplexity(all),
  ];
  const seen = new Set<number>();
  let pool: { p: PickedProgression; weight: number }[] = [];
  let contributing = 0;
  for (const tier of tiers) {
    if (pool.length >= MIN_POOL) break;
    // A wide tier fills the pool to twice its size, a seeded sample of it
    // (shuffled, then read until there's enough), so the closer tiers stay
    // likely and a pick reads a few dozen loops, not the library.
    const room = MIN_POOL * 2 - pool.length;
    const shuffled = tier()
      .filter((e) => !seen.has(e.id))
      .map((e) => ({ e, at: rng() }))
      .sort((a, b) => a.at - b.at);
    const prepared: { p: PickedProgression; weight: number }[] = [];
    for (const { e } of shuffled) {
      seen.add(e.id);
      const p = prepare(e, plan, role);
      if (p) prepared.push({ p, weight: 0 });
      if (prepared.length >= room * 2) break;
    }
    const ready = contrasting(prepared, avoid).slice(0, room);
    if (!ready.length) continue;
    const weight =
      TIER_WEIGHTS[Math.min(contributing++, TIER_WEIGHTS.length - 1)];
    pool.push(...ready.map((c) => ({ ...c, weight })));
  }
  if (recent?.size) {
    const unplayed = pool.filter(({ p }) => !recent.has(p.id!));
    if (unplayed.length) pool = unplayed;
  }
  if (pool.length) {
    const { p } = pickWeighted(rng, pool, (c) => c.weight);
    return phraseOf(
      p,
      pool.map((c) => c.p),
      plan,
      rng,
      harmony,
    );
  }

  const own = BUILT_IN[plan.mode];
  const degrees = (role === 'bridge' ? offTonic(own, plan.mode) : null) ?? own;
  const chords = chordsInKey(
    degrees,
    parentOf(plan.tonicPc, plan.mode),
    accidentalsOf(plan.tonicLabel),
  )!;
  return phraseOf(
    { id: null, degrees, chords, timed: perBar(chords) },
    [],
    plan,
    rng,
    harmony,
  );
}

// ── Chords over a bass line (owner, 2026-11-10) ─────────────────────────────
//
// "New chords are not following the harmony created by the bassline": where
// the song has a bass line, chords asked for stand on it. Each loop of the
// style, in every rotation, is laid over the spot (a chord a bar, a longer
// loop held as its phrase) and scored note by note against the bass: the
// bass on the chord's root is a fit, on its 3rd or 5th a fit as a slash
// chord (C/E), on its 7th a weaker one, anything else none. The loops
// closest to the best fit are the pool, so the chords still vary in quality
// and colour; when none fits well, each bass note gets the chord the mode
// builds on it.

/** A bass note the chords stand on: when it's struck, from the spot's start. */
export interface BassSlot {
  tick: number;
  pc: number;
}

/** How well a chord stands on a bass note, 0–1, and how it's written there. */
function fitOn(symbol: string, pc: number): { score: number; slash: boolean } {
  const tones = chordSymbolTones(symbol);
  if (!tones) return { score: 0, slash: false };
  const from = (((pc - tones.rootPc) % 12) + 12) % 12;
  if (from === 0) return { score: 1, slash: false };
  const at = (interval: number | undefined) =>
    interval !== undefined && interval % 12 === from;
  if (at(tones.third) || from === 7) return { score: 0.6, slash: true };
  if (at(tones.seventh)) return { score: 0.4, slash: true };
  return { score: 0, slash: false };
}

/** The share of a loop's chords over the bass that fit it, 0–1. */
function fitScore(
  chordAt: (tick: number) => string,
  bass: readonly BassSlot[],
): number {
  if (!bass.length) return 0;
  return (
    bass.reduce((sum, b) => sum + fitOn(chordAt(b.tick), b.pc).score, 0) /
    bass.length
  );
}

/** A loop's symbol sounding at a tick, laid as its phrase lays it. */
function layAt(loop: readonly string[]): (tick: number) => string {
  const rhythm = HARMONIC_RHYTHM[loop.length];
  if (!rhythm) return (tick) => loop[Math.floor(tick / BAR) % loop.length];
  const ends = rhythm.map((_, i) =>
    rhythm.slice(0, i + 1).reduce((a, b) => a + b, 0),
  );
  return (tick) => {
    const bar = Math.floor(tick / BAR) % PHRASE_BARS;
    return loop[ends.findIndex((end) => bar < end)];
  };
}

/** Every rotation of a loop. */
const rotations = (loop: readonly string[]) =>
  loop.map((_, i) => [...loop.slice(i), ...loop.slice(0, i)]);

/** A note's name in the plan's key spelling, for a slash chord's bass. */
function bassName(plan: PromptPlan, pc: number): string {
  const name = noteName(parentOf(plan.tonicPc, plan.mode), pc);
  const accidentals = accidentalsOf(plan.tonicLabel);
  return accidentals === 'flats'
    ? (TO_FLAT[name] ?? name)
    : accidentals === 'sharps'
      ? (TO_SHARP[name] ?? name)
      : name;
}

/**
 * Chords sounding over the bass, timed: each bass note's chord, written over
 * it as a slash chord where it stands on the chord's 3rd, 5th or 7th, the
 * mode's own chord on it where it stands on none; a rest keeps the chord
 * before.
 */
function overBass(
  chordAt: (tick: number) => string,
  bass: readonly BassSlot[],
  length: number,
  plan: PromptPlan,
): TimedChords {
  const changes: { tick: number; symbol: string }[] = [];
  for (const b of bass) {
    // A note the loop doesn't stand on gets the mode's chord on it: close
    // to the best fit is no excuse for a clash.
    const own = chordAt(b.tick);
    const chord = fitOn(own, b.pc).score > 0 ? own : modeChordOn(plan, b.pc);
    const fit = fitOn(chord, b.pc);
    // Written over the note the bass plays: C/E on an E, C (not C/E) on a C.
    const plain = chord.split('/')[0];
    const symbol = fit.slash
      ? `${plain}/${bassName(plan, b.pc)}`
      : fit.score === 1
        ? plain
        : chord;
    const tick = changes.length ? b.tick : 0;
    if (changes.at(-1)?.symbol !== symbol) changes.push({ tick, symbol });
  }
  return { changes, length };
}

/** The chords the major scale builds on each of its notes, by semitone. */
const SCALE_CHORDS: Record<number, [triad: string, seventh: string]> = {
  0: ['1 major', '1 major7'],
  2: ['2 minor', '2 minor7'],
  4: ['3 minor', '3 minor7'],
  5: ['4 major', '4 major7'],
  7: ['5 major', '5 dominant7'],
  9: ['6 minor', '6 minor7'],
  11: ['7 diminished', '7 minor7b5'],
};

/**
 * The chord the mode builds on a pitch class, at the plan's richness; on a
 * note outside the mode (♭VII in major, ♭VI…), the major chord or the
 * dominant 7th on it.
 */
function modeChordOn(plan: PromptPlan, pc: number): string {
  const parent = parentOf(plan.tonicPc, plan.mode);
  const own = SCALE_CHORDS[(((pc - parent) % 12) + 12) % 12];
  const written =
    own &&
    chordsInKey(
      [plan.complexity === 'triad' ? own[0] : own[1]],
      parent,
      accidentalsOf(plan.tonicLabel),
    )?.[0];
  return (
    written || `${bassName(plan, pc)}${plan.complexity === 'triad' ? '' : '7'}`
  );
}

/** How close to the best fit a loop must be to join the pool. */
const FIT_SLACK = 0.85;

/** Below this, no loop stands on the bass: the mode's own chords do. */
const FIT_FLOOR = 0.75;

/**
 * Chords that stand on the song's bass line (the section header): the
 * style's loops that fit it best, a seeded pick weighted by fit and by the
 * prompt's moods; else the mode's chord on each bass note. `length` is the
 * spot's, in ticks.
 */
export function fitBass(
  library: readonly ChordProgressionEntry[],
  plan: PromptPlan,
  bass: readonly BassSlot[],
  length: number,
  rng: EchoRandom,
  { recent }: Pick<PickOptions, 'recent'> = {},
): PickedProgression {
  const ofStyle = styleIds(library, plan.styleTag);
  const moods = new Set(
    plan.vibes.flatMap((vibe) =>
      filterByVibeAndStyle([...library], vibe).map((e) => e.id),
    ),
  );
  const parent = parentOf(plan.tonicPc, plan.mode);
  const fits: { p: PickedProgression; score: number; weight: number }[] = [];
  for (const entry of library) {
    if (!ofStyle.has(entry.id) && !moods.has(entry.id)) continue;
    const loop = asLoop(entry.chords);
    const chords =
      loop && chordsInKey(loop, parent, accidentalsOf(plan.tonicLabel));
    if (!chords) continue;
    let best: { chords: string[]; score: number } | null = null;
    for (const turn of rotations(chords)) {
      const score = fitScore(layAt(turn), bass);
      if (!best || score > best.score) best = { chords: turn, score };
    }
    if (!best) continue;
    const timed = overBass(layAt(best.chords), bass, length, plan);
    fits.push({
      p: { id: entry.id, degrees: loop!, chords: changesOf(timed), timed },
      score: best.score,
      weight:
        (ofStyle.has(entry.id) ? 1 : 0) +
        (moods.has(entry.id) ? 1 : 0) +
        (entry.complexity === plan.complexity ? 1 : 0),
    });
  }
  const top = Math.max(0, ...fits.map((f) => f.score));
  if (top >= FIT_FLOOR) {
    let pool = fits.filter((f) => f.score >= top * FIT_SLACK);
    if (recent?.size) {
      const unplayed = pool.filter((f) => !recent.has(f.p.id!));
      if (unplayed.length) pool = unplayed;
    }
    return pickWeighted(rng, pool, (f) => f.weight * f.score ** 4).p;
  }
  const own = (tick: number) =>
    modeChordOn(
      plan,
      [...bass].reverse().find((b) => b.tick <= tick)?.pc ?? plan.tonicPc,
    );
  const timed = overBass(own, bass, length, plan);
  return { id: null, degrees: [], chords: changesOf(timed), timed };
}

/**
 * The share of bass notes the chords stand on (on a root, a 3rd or a 5th),
 * 0–1: whether chords already there follow the bass.
 */
export function bassAgreement(
  chordAt: (tick: number) => string,
  bass: readonly BassSlot[],
): number {
  if (!bass.length) return 1;
  return (
    bass.filter((b) => fitOn(chordAt(b.tick), b.pc).score >= 0.6).length /
    bass.length
  );
}
