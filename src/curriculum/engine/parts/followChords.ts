/**
 * followChords.ts — "Follows the chords": a captured part played over a
 * chart it wasn't captured over, the way its player would play it there.
 *
 * A part keeps the exact notes its player played over its own chords
 * (`chordSymbols`). To play it over another progression — Music Literacy's
 * Hear It with Your Band plays the student's own — its notes are read as
 * numbers first (`numberPart`): each against the chord sounding at it, 1, ♭3,
 * 3, 5, ♭7, 9 and so on, with its hand and its place in that hand's stack. A
 * note outside the chord in a single line is a passing tone, numbered by the
 * key's scale degree; a chromatic note a half step into the next one is an
 * approach.
 *
 * Then the numbers are played over the new chart one hit at a time
 * (`followChords`), a hit being the notes one hand strikes together. Each
 * number becomes the new chord's own tone. A color the new chord doesn't
 * name comes from the chart's scale, so a band's 7ths and 9ths survive over a
 * student's triads (Dm becomes Dm7 in D minor, G becomes G7 in C), but never
 * as an avoid note: a ♭9 over any chord, a ♮11 over a major chord or a ♭13
 * over a minor one falls to the nearest chord tone. Passing tones step
 * through the chart's scale from the note before them; approach notes keep
 * their half step into the note after.
 *
 * Each hit is voiced where the player's hand went from its last hit, in the
 * player's own inversion and spacing unless another inversion lies clearly
 * nearer, and inside the hand's captured register. A single line — a bass
 * part, a left hand playing bass — moves the same way, note by note, so its
 * roots land on the new chord's roots. Timing, lengths, velocities and hands
 * stay the player's, so the rhythm is theirs.
 *
 * Over its own chords in its own key a part plays exactly as it was captured:
 * the round trip its tests hold every part in the library to.
 *
 * No audio and no React here.
 */

import {
  approachPitch,
  chordScale,
  type ApproachMotion,
  type ApproachScale,
} from '../approach/approach';
import { keyNotesUnder } from '../bassLines/bassLine';
import {
  chordSymbolTones,
  type ChordSymbolTones,
} from '../genreGeneration/chordSymbolTones';
import {
  buildChordTimeline,
  chordAtTick,
  type TimedChord,
} from '../genreGeneration/chordTimeline';
import { SCALES } from '../genreGeneration/scaleRegistry';
import {
  barChords,
  barTicks,
  partTicks,
  playedTick,
  PPQ,
  type InstrumentPart,
  type PartInstrument,
  type PartKey,
  type PartNote,
} from './part';

/** A note of a part played over another chart, and the note it plays. */
export interface FollowedNote extends PartNote {
  /** Its index in the part's `notes`. */
  source: number;
  role: NoteRole;
  /** The chord it plays over: the one its hit sounds, or pushes into. */
  chord: ChordSymbolTones;
}

/** What a note does over its chord. */
export type NoteRole = 'chord' | 'passing' | 'approach';

/** One note of a part, read against the chord it was played over. */
export interface NumberedNote {
  /** Its index in the part's `notes`. */
  index: number;
  /**
   * The hand that plays it: its own, or for a note a two-hand part leaves
   * unmarked, the hand it sits nearer.
   */
  hand?: 'lh' | 'rh';
  /** Its place in its hand's stack at that hit, from the bottom (0). */
  voice: number;
  /** How many notes the hand strikes in that hit. */
  voices: number;
  /** The chord it was played over, as the part's chart names it. */
  chord: string;
  role: NoteRole;
  /**
   * A chord note's number against the chord: '1', 'b3', '3', '5', 'b7', '7',
   * '9', '11', '13' and their alterations, '2' and '4' for a sus chord's, and
   * 'bass' for a slash chord's bass note. A passing or approach note's scale
   * degree in the part's key: '2', 'b6', '#4'.
   */
  number: string;
}

// ── Reading the part ───────────────────────────────────────────────────────

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Semitones from one tonic to another, the shorter way (−5 … +6). */
export function keyShift(fromTonic: number, toTonic: number): number {
  const up = mod12(toTonic - fromTonic);
  return up > 6 ? up - 12 : up;
}

/**
 * A hit held across a chord change it starts this close before pushes into
 * that chord: an eighth note. It must ring past the change by `HOLD` ticks.
 */
const PUSH = 240;
const HOLD = 60;
/** How finely the chart is read for a change inside the push. */
const PUSH_STEP = 30;

/**
 * A hand's register: where it was captured. A hand plays in its own register
 * whatever the key, so this doesn't move with the part.
 */
interface Register {
  low: number;
  high: number;
  /** The instrument's lowest note: a bass's low E. */
  floor: number;
}

const LOWEST: Record<PartInstrument, number> = {
  piano: 21, // A0
  bass: 28, // E1
  guitar: 40, // E2
  drums: 0,
};

/**
 * How far past its register a hand may go: a tritone, so every pitch class
 * has a place near any note it played. Each semitone past costs `OUTSIDE`.
 */
const STRAY = 6;
const OUTSIDE = 2;
type Member = 1 | 3 | 5 | 7 | 9 | 11 | 13 | 'bass';

/** A chord note's number: what it is in the chord, and its exact interval. */
interface ChordNumber {
  member: Member;
  /** Semitones above the root, as played: the ♭ or ♯ of it. */
  interval: number;
  label: string;
}

type HandGroup = 'lh' | 'rh' | '-';

/** The notes one hand strikes together. */
interface Hit {
  /** Its place in the part's hits, in time order. */
  order: number;
  /** The hand that plays it, or '-' for a part that names none. */
  group: HandGroup;
  /** Its hand's hits with as many notes: a line, a run of stabs. */
  stream: string;
  /** Written ticks, inside the loop. */
  tick: number;
  end: number;
  /** The pitches struck, low to high. */
  voices: number[];
  /** Each note's index in the part and the voice it sounds. */
  notes: { index: number; voice: number }[];
  /** Grace notes before it: the voice each leads into, and from how far. */
  graces: { index: number; voice: number; offset: number }[];
  chord: TimedChord;
  /** The part's key under that chord. */
  scale: Set<number>;
  role: NoteRole;
  /** A chord hit's numbers, one per voice. */
  numbers: ChordNumber[];
  /**
   * Each voice's place in the hit's own chord cycle (its distinct numbers
   * going up from the bottom note), which an inversion turns.
   */
  cycle: number[];
  /** A passing tone's step from the note before: in the scale, in semitones. */
  passing?: { steps: number; semitones: number };
  /**
   * An approach: the hit it leads into (in the next pass when it `wraps`),
   * the voice there each of its voices leads to, and from how far.
   */
  approach?: {
    to: Hit;
    wraps: boolean;
    voices: number[];
    /** Each voice's steps from its target voice: half steps, else scale steps. */
    offsets: number[];
    /** Set by hand (PartNote.approach): diatonic steps a scale's. */
    motion?: ApproachMotion;
    scale?: ApproachScale;
  };
}

interface Analysis {
  loop: number;
  /** The part's own chart, looping. */
  chordAt: (tick: number) => TimedChord;
  hits: Hit[];
  /** Each hand's captured range. */
  ranges: Map<HandGroup, Register>;
}

const sameChord = (a: ChordSymbolTones, b: ChordSymbolTones) =>
  a.rootPc === b.rootPc &&
  a.bassPc === b.bassPc &&
  a.intervals.length === b.intervals.length &&
  a.intervals.every((i, k) => i === b.intervals[k]);

const sameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** A key's notes as pitch classes: a Part key (tonic, Prism mode). */
export function keyNotes(key: PartKey): number[] {
  return (SCALES[key.mode] ?? SCALES.ionian).map((i) => mod12(key.tonic + i));
}

/**
 * The key's notes under a chord: its own tones take the place of the key
 * notes they alter (bassLines' `chordDiatonic`, the Walk rules' scale), and
 * every tone it names is in.
 */
function scaleUnder(
  key: readonly number[],
  chord: ChordSymbolTones,
): Set<number> {
  const tones = chord.intervals.map((i) => mod12(chord.rootPc + i));
  const scale = keyNotesUnder(key, tones);
  tones.forEach((t) => scale.add(t));
  scale.add(chord.bassPc);
  return scale;
}

/**
 * The chord a hit plays: the one sounding at it, unless it pushes into the
 * next — struck within an eighth of a change and still ringing after it.
 * Read the same way off the part's chart and the one it follows, so a push
 * stays a push.
 */
export function chordStruck<C extends ChordSymbolTones>(
  tick: number,
  end: number,
  chordAt: (tick: number) => C,
): C {
  const here = chordAt(tick);
  for (let d = PUSH_STEP; d <= PUSH; d += PUSH_STEP) {
    const next = chordAt(tick + d);
    if (!sameChord(next, here)) return end > tick + d + HOLD ? next : here;
  }
  return here;
}

const DEGREES = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  '#4',
  '5',
  'b6',
  '6',
  'b7',
  '7',
];

/** A note's number against a chord: a tone it names, or the color it adds. */
function chordNumber(
  midi: number,
  chord: ChordSymbolTones,
  bottom: boolean,
): ChordNumber {
  const interval = mod12(midi - chord.rootPc);
  const n = (member: Member, label: string) => ({ member, interval, label });
  if (bottom && mod12(midi) === chord.bassPc && chord.bassPc !== chord.rootPc)
    return n('bass', 'bass');
  if (interval === 0) return n(1, '1');
  if (interval === chord.third)
    return interval === 2
      ? n(9, '2')
      : interval === 5
        ? n(3, '4')
        : n(3, interval === 3 ? 'b3' : '3');
  if (interval === chord.fifth)
    return n(5, interval === 6 ? 'b5' : interval === 8 ? '#5' : '5');
  if (interval === chord.seventh) {
    if (interval === 9)
      return chord.third === 3 && chord.fifth === 6 ? n(7, 'bb7') : n(13, '6');
    return n(7, interval === 10 ? 'b7' : '7');
  }
  switch (interval) {
    case 1:
      return n(9, 'b9');
    case 2:
      return n(9, '9');
    case 3:
      return chord.third === 4 ? n(9, '#9') : n(3, 'b3');
    case 4:
      return n(3, '3');
    case 5:
      return n(11, '11');
    case 6:
      return chord.fifth === 7 || chord.fifth === undefined
        ? n(11, '#11')
        : n(5, 'b5');
    case 7:
      return n(5, '5');
    case 8:
      return chord.fifth === 7 || chord.fifth === undefined
        ? n(13, 'b13')
        : n(5, '#5');
    case 9:
      return n(13, '13');
    case 10:
      return n(7, 'b7');
    default:
      return n(7, '7');
  }
}

const isChordTone = (midi: number, chord: ChordSymbolTones, bottom: boolean) =>
  chord.intervals.includes(mod12(midi - chord.rootPc)) ||
  (bottom && mod12(midi) === chord.bassPc);

/** Scale steps from `a` to `b`: the scale notes passed, `b` if it is one. */
function stepsBetween(a: number, b: number, scale: Set<number>): number {
  let steps = 0;
  if (b > a) {
    for (let x = a + 1; x <= b; x++) if (scale.has(mod12(x))) steps++;
  } else {
    for (let x = a - 1; x >= b; x--) if (scale.has(mod12(x))) steps--;
  }
  return steps;
}

/** The note `steps` scale notes above (or, negative, below) `a`. */
function stepFrom(a: number, steps: number, scale: Set<number>): number {
  const dir = Math.sign(steps);
  let x = a;
  for (let left = Math.abs(steps); left > 0; ) {
    x += dir;
    if (scale.has(mod12(x))) left--;
  }
  return x;
}

/**
 * A passing tone `steps` scale notes from the note before it, turned the
 * other way when that would take the hand past its register.
 */
function passBy(
  from: number,
  steps: number,
  scale: Set<number>,
  register: Register,
): number {
  const to = stepFrom(from, steps, scale);
  const past = Math.max(register.low - to, to - register.high);
  return past > STRAY || to < register.floor
    ? stepFrom(from, -steps, scale)
    : to;
}

/** The scale note nearest `m`, the lower on a tie. */
function nearestIn(m: number, scale: Set<number>): number {
  for (let d = 0; d < 12; d++) {
    if (scale.has(mod12(m - d))) return m - d;
    if (scale.has(mod12(m + d))) return m + d;
  }
  return m;
}

/**
 * Which hand plays each note. Notes a two-hand part leaves unmarked go, as
 * the chord they strike together, to the hand they sit nearer; in any other
 * part unmarked notes are their own.
 */
function handGroups(notes: readonly PartNote[]): HandGroup[] {
  const median = (hand: 'lh' | 'rh') => {
    const m = notes
      .filter((n) => n.hand === hand)
      .map((n) => n.midi)
      .sort((a, b) => a - b);
    return m.length ? m[m.length >> 1] : undefined;
  };
  const lh = median('lh');
  const rh = median('rh');
  const unmarked = new Map<number, number[]>();
  notes.forEach((n) => {
    if (!n.hand)
      unmarked.set(n.tick, [...(unmarked.get(n.tick) ?? []), n.midi]);
  });
  return notes.map((n): HandGroup => {
    if (n.hand) return n.hand;
    if (lh === undefined || rh === undefined) return '-';
    const struck = unmarked.get(n.tick)!;
    const mean = struck.reduce((a, b) => a + b, 0) / struck.length;
    return Math.abs(mean - lh) < Math.abs(mean - rh) ? 'lh' : 'rh';
  });
}

/** A part's hits, with the notes of each, in time order. */
function partHits(
  part: InstrumentPart,
  chordAt: (tick: number) => TimedChord,
  key: readonly number[],
): Hit[] {
  const groups = handGroups(part.notes);
  const together = new Map<
    string,
    { group: HandGroup; tick: number; at: number[] }
  >();
  part.notes.forEach((n, index) => {
    const key = `${groups[index]}@${n.tick}`;
    const hit = together.get(key) ?? {
      group: groups[index],
      tick: n.tick,
      at: [],
    };
    hit.at.push(index);
    together.set(key, hit);
  });
  const hits: Hit[] = [];
  for (const { group, tick, at } of together.values()) {
    // A grace note leads into its main note; alone it is a note of its own.
    const main = at.filter((i) => !part.notes[i].grace);
    const own = main.length ? main : at;
    const voices = [...new Set(own.map((i) => part.notes[i].midi))].sort(
      (a, b) => a - b,
    );
    const voiceOf = (midi: number) =>
      voices.reduce(
        (best, v, k) =>
          Math.abs(v - midi) < Math.abs(voices[best] - midi) ? k : best,
        0,
      );
    const end = Math.max(
      ...at.map((i) => part.notes[i].tick + part.notes[i].duration),
    );
    const chord = chordStruck(tick, end, chordAt);
    hits.push({
      order: 0,
      group,
      stream: `${group}:${voices.length}`,
      tick,
      end,
      voices,
      notes: own.map((index) => ({
        index,
        voice: voices.indexOf(part.notes[index].midi),
      })),
      graces: main.length
        ? at
            .filter((i) => part.notes[i].grace)
            .map((index) => {
              const voice = voiceOf(part.notes[index].midi);
              return {
                index,
                voice,
                offset: part.notes[index].midi - voices[voice],
              };
            })
        : [],
      chord,
      scale: scaleUnder(key, chord),
      role: 'chord',
      numbers: [],
      cycle: [],
    });
  }
  hits.sort(
    (a, b) =>
      a.tick - b.tick || (a.group < b.group ? -1 : a.group > b.group ? 1 : 0),
  );
  hits.forEach((h, order) => (h.order = order));
  return hits;
}

/**
 * A chord that arrives with the first chord a bar strikes starts at the bar:
 * the bass note under it on the downbeat, before the chord on beat 2 of a
 * vals, is already its root.
 */
function settleOnBars(
  timeline: TimedChord[],
  notes: readonly PartNote[],
  bar: number,
): TimedChord[] {
  const pcsAt = new Map<number, Set<number>>();
  for (const n of notes)
    pcsAt.set(n.tick, (pcsAt.get(n.tick) ?? new Set()).add(mod12(n.midi)));
  const strikes = [...pcsAt]
    .filter(([, pcs]) => pcs.size > 1)
    .map(([tick]) => tick);
  return timeline.map((chord, i) => {
    const start = Math.floor(chord.tick / bar) * bar;
    const before = timeline[i - 1];
    if (!before || start === chord.tick || before.tick >= start) return chord;
    return strikes.some((t) => t >= start && t < chord.tick)
      ? chord
      : { ...chord, tick: start };
  });
}

/**
 * A part's own chart as a band take writes it: an entry a bar, looping, each
 * chord from the slot of the bar it's struck in (`barChords`: 'Dm7 G7' is
 * Dm7 for half the bar, then G7).
 */
function barTimeline(
  symbols: readonly string[],
  bars: number,
  barLength: number,
): TimedChord[] {
  const timeline: TimedChord[] = [];
  for (let b = 0; b < bars; b++) {
    const slots = barChords(symbols[b % symbols.length]);
    slots.forEach((symbol, i) => {
      const tones = symbol ? chordSymbolTones(symbol) : null;
      if (symbol && tones)
        timeline.push({
          ...tones,
          symbol,
          tick: b * barLength + Math.round((i * barLength) / slots.length),
        });
    });
  }
  return timeline;
}

/** Each hit's neighbours among `hits` (one hand's, or one line's), looping. */
function neighbours(hits: readonly Hit[]) {
  return hits.map((hit, k) => ({
    hit,
    prev: hits[(k - 1 + hits.length) % hits.length],
    next: hits[(k + 1) % hits.length],
    nextWraps: k === hits.length - 1,
  }));
}

function analyse(part: InstrumentPart): Analysis | null {
  if (!part.chordSymbols?.length || !part.notes.length) return null;
  const loop = partTicks(part);
  if (loop <= 0) return null;
  // When its chords sound. A part taken from a lesson keeps the timing its
  // lesson gives them (chordTimeline.ts): at the strikes that sound them,
  // Am9 on beat 1 and D13 on beat 3. Any other part has an entry a bar,
  // looping, as a band take writes them.
  const bar = barTicks(part.timeSignature);
  const timeline = settleOnBars(
    part.source.kind === 'lesson'
      ? buildChordTimeline(
          part.chordSymbols,
          part.notes.map((n) => ({ onset: n.tick, midi: n.midi })),
          part.bars,
          bar,
        )
      : barTimeline(part.chordSymbols, part.bars, bar),
    part.notes,
    bar,
  );
  if (!timeline.length) return null;
  const chordAt = (tick: number) =>
    chordAtTick(timeline, ((tick % loop) + loop) % loop) ?? timeline[0];

  const key = keyNotes(part.key);
  const hits = partHits(part, chordAt, key);
  const chromatic = (h: Hit) =>
    h.voices.filter((v) => !h.scale.has(mod12(v))).length;
  const outsideKey = (h: Hit) =>
    h.voices.filter((v) => !key.includes(mod12(v))).length;

  const byGroup = new Map<HandGroup, Hit[]>();
  const byStream = new Map<string, Hit[]>();
  for (const h of hits) {
    byGroup.set(h.group, [...(byGroup.get(h.group) ?? []), h]);
    byStream.set(h.stream, [...(byStream.get(h.stream) ?? []), h]);
  }
  const inGroup = new Map(
    [...byGroup.values()].flatMap((g) => neighbours(g).map((x) => [x.hit, x])),
  );
  const inStream = new Map(
    [...byStream.values()].flatMap((s) => neighbours(s).map((x) => [x.hit, x])),
  );
  // An approach leads straight into its target: struck no later than an
  // eighth after it ends.
  const leadsInto = (h: Hit, to: Hit, wraps: boolean) =>
    to.tick + (wraps ? loop : 0) <= Math.max(h.end, h.tick + PUSH) + PUSH &&
    (to !== h || wraps);

  /**
   * An approach. A single note outside its chord's scale, a half step into
   * a note of its hand's next hit that is in it: A♭ into G. Or a chord
   * moving every voice the same half step into the next, struck within a
   * quarter of it and further outside the key — G♭–B♭–E♭ into G–B–E, and a
   * chord the chart names that way, A♭9 into A9.
   */
  const approachOf = (h: Hit): Hit['approach'] => {
    if (h.voices.length === 1) {
      if (!chromatic(h)) return undefined;
      const { next, nextWraps } = inGroup.get(h)!;
      if (!leadsInto(h, next, nextWraps)) return undefined;
      const p = h.voices[0];
      const voice = next.voices.findIndex(
        (v) => Math.abs(v - p) === 1 && next.scale.has(mod12(v)),
      );
      return voice < 0
        ? undefined
        : {
            to: next,
            wraps: nextWraps,
            voices: [voice],
            offsets: [p - next.voices[voice]],
          };
    }
    const { next, nextWraps } = inStream.get(h)!;
    const offsets = h.voices.map((v, j) => v - next.voices[j]);
    if (
      next === h ||
      next.tick + (nextWraps ? loop : 0) - h.tick > PPQ ||
      Math.abs(offsets[0]) !== 1 ||
      offsets.some((o) => o !== offsets[0]) ||
      outsideKey(h) <= outsideKey(next)
    )
      return undefined;
    return {
      to: next,
      wraps: nextWraps,
      voices: h.voices.map((_, j) => j),
      offsets,
    };
  };

  // Approaches marked by hand (PartNote.approach): into the hand's next
  // chord that isn't one, or is one marked a goal (a chain), each voice its
  // marked steps from the goal's voice it moves with.
  const markOf = (h: Hit) =>
    h.notes.map(({ index }) => part.notes[index]).find((n) => n.approach);
  const isGoal = (h: Hit) =>
    !markOf(h) || h.notes.some(({ index }) => part.notes[index].goal);
  for (const h of hits) {
    const mark = markOf(h)?.approach;
    if (!mark) continue;
    const line = byGroup.get(h.group)!;
    const at = line.indexOf(h);
    let k = 1;
    while (k < line.length && !isGoal(line[(at + k) % line.length])) k++;
    if (k >= line.length) continue;
    const to = line[(at + k) % line.length];
    const voiceTo = (midi: number, j: number) =>
      to.voices.length === h.voices.length
        ? j
        : to.voices.reduce(
            (best, v, t) =>
              Math.abs(v - midi) < Math.abs(to.voices[best] - midi) ? t : best,
            0,
          );
    h.role = 'approach';
    h.approach = {
      to,
      wraps: at + k >= line.length,
      voices: h.voices.map(voiceTo),
      offsets: h.voices.map((v) => {
        const note = h.notes.find(({ index }) => part.notes[index].midi === v);
        return note
          ? (part.notes[note.index].approach?.step ?? 0)
          : v - to.voices[voiceTo(v, h.voices.indexOf(v))];
      }),
      motion: mark.motion,
      ...(mark.scale ? { scale: mark.scale } : {}),
    };
  }
  for (const h of hits) {
    if (h.approach) continue;
    const approach = approachOf(h);
    if (approach) {
      h.role = 'approach';
      h.approach = approach;
    }
  }
  // What a passing tone steps from: the last note of its line that isn't an
  // approach (an approach is placed from the note after it).
  const stepsFrom = (h: Hit) => {
    const line = byStream.get(h.stream)!;
    const k = line.indexOf(h);
    for (let d = 1; d <= line.length; d++) {
      const before = line[(k - d + line.length) % line.length];
      if (before.role !== 'approach') return before;
    }
    return h;
  };
  for (const h of hits) {
    if (h.role === 'approach') continue;
    if (h.voices.length === 1 && !isChordTone(h.voices[0], h.chord, true)) {
      // A note outside the chord in a line passes through, by step from
      // the note before it or into the one after; one leapt to and from is
      // a color of the chord.
      const p = h.voices[0];
      const from = stepsFrom(h).voices[0];
      const next = inStream.get(h)!.next.voices[0];
      if (Math.abs(p - from) <= 2 || Math.abs(next - p) <= 2) {
        h.role = 'passing';
        h.passing = {
          steps: stepsBetween(from, p, h.scale),
          semitones: p - from,
        };
        continue;
      }
    }
    h.numbers = h.voices.map((v, j) => chordNumber(v, h.chord, j === 0));
    // The hit's chord cycle: its distinct numbers going up from the bottom
    // note, as close position would stack them.
    const above = (label: string) =>
      mod12(
        h.voices[h.numbers.findIndex((n) => n.label === label)] - h.voices[0],
      );
    const labels = [...new Set(h.numbers.map((n) => n.label))].sort(
      (a, b) => above(a) - above(b),
    );
    h.cycle = h.numbers.map((n) => labels.indexOf(n.label));
  }

  const ranges = new Map<HandGroup, Register>();
  for (const [group, own] of byGroup) {
    const pitches = own.flatMap((h) => h.voices);
    const low = Math.min(...pitches);
    ranges.set(group, {
      low,
      high: Math.max(...pitches),
      floor: Math.min(low, LOWEST[part.instrument]),
    });
  }
  return { loop, chordAt, hits, ranges };
}

const analyses = new WeakMap<InstrumentPart, Analysis | null>();

function analysisOf(part: InstrumentPart): Analysis | null {
  if (!analyses.has(part)) analyses.set(part, analyse(part));
  return analyses.get(part) ?? null;
}

// ── Stay in Key ──────────────────────────────────────────────────────────

/** Whether a hand of the part Stays in Key (InstrumentPart.stayInKey). */
const staysInKey = (part: InstrumentPart, group: HandGroup) =>
  part.stayInKey === 'both' || part.stayInKey === group;

/**
 * A note of a hand that Stays in Key, in another key: the same degree of
 * that key's scale (C–G in C major is 1–5: D–A in D, A–E in A minor; a held
 * 3rd takes the new key's 3rd), a note outside the scale raised from the
 * degree below it, as written. Placed nearest where the player had it,
 * moved to the new key.
 */
function inKey(midi: number, from: PartKey, to: PartKey): number {
  const fromScale = SCALES[from.mode] ?? SCALES.ionian;
  const toScale = SCALES[to.mode] ?? SCALES.ionian;
  const step = mod12(midi - from.tonic);
  let degree = fromScale.length - 1;
  while (degree > 0 && fromScale[degree] > step) degree--;
  const pc = mod12(to.tonic + toScale[degree] + step - fromScale[degree]);
  const home = midi + keyShift(from.tonic, to.tonic);
  return home + mod12(pc - home + 6) - 6;
}

/**
 * The hands that keep the same notes through the chord changes of their own
 * chart, which Stay in Key would keep doing over any other: the right hand
 * holding C–G over C, G, Am and F; a left hand's ostinato. Each chord's
 * stretch of a hand is the pitch classes it plays there; a hand holds when
 * every stretch plays the same ones, over at least two different chords.
 * What to suggest for `stayInKey`, or null when no hand holds.
 */
export function suggestStayInKey(
  part: InstrumentPart,
): InstrumentPart['stayInKey'] | null {
  if (!followsChords(part)) return null;
  const analysis = analysisOf(part);
  if (!analysis) return null;
  const stretches = new Map<HandGroup, Map<string, Set<number>>>();
  const chords = new Map<HandGroup, Set<string>>();
  for (const h of analysis.hits) {
    const byChord = stretches.get(h.group) ?? new Map<string, Set<number>>();
    stretches.set(h.group, byChord);
    const at = `${h.chord.tick}:${h.chord.symbol}`;
    const pcs = byChord.get(at) ?? new Set<number>();
    byChord.set(at, pcs);
    h.voices.forEach((v) => pcs.add(mod12(v)));
    chords.set(h.group, (chords.get(h.group) ?? new Set()).add(h.chord.symbol));
  }
  const holds = [...stretches].filter(([group, byChord]) => {
    const sets = [...byChord.values()].map((pcs) => [...pcs].sort().join());
    return (
      (chords.get(group)?.size ?? 0) > 1 && sets.every((set) => set === sets[0])
    );
  });
  const held = new Set(holds.map(([group]) => group));
  if (held.has('-') || (held.has('lh') && held.has('rh'))) return 'both';
  if (held.has('lh')) return 'lh';
  if (held.has('rh')) return 'rh';
  return null;
}

/**
 * Whether a part follows a chart's chords when asked to: a pitched part that
 * isn't a melody. A melody keeps its tune and moves to the key; drums don't
 * move at all.
 */
export const followsChords = (
  part: Pick<InstrumentPart, 'instrument' | 'role'>,
) => part.instrument !== 'drums' && part.role !== 'melody';

/**
 * Whether a part can follow a chart's chords: one that does (`followsChords`)
 * and names the chords it was played over, with notes to read against them.
 */
export const canFollowChords = (part: InstrumentPart) =>
  followsChords(part) && analysisOf(part) !== null;

/**
 * The part's own chart, looping with it: the chord sounding at a tick, as
 * its notes play them. Null when it names no chords.
 */
export function partChordAt(
  part: InstrumentPart,
): ((tick: number) => ChordSymbolTones) | null {
  return analysisOf(part)?.chordAt ?? null;
}

/**
 * Every note of a part with its number against the chord it was played over,
 * in the part's own order. Empty when the part names no chords.
 */
export function numberPart(part: InstrumentPart): NumberedNote[] {
  const analysis = analysisOf(part);
  if (!analysis) return [];
  const out: NumberedNote[] = [];
  const degree = (midi: number) => DEGREES[mod12(midi - part.key.tonic)];
  const handOf = (h: Hit): { hand?: 'lh' | 'rh' } =>
    h.group === '-' ? {} : { hand: h.group };
  for (const h of analysis.hits) {
    const base = { voices: h.voices.length, chord: h.chord.symbol };
    for (const { index, voice } of h.notes) {
      out.push({
        index,
        ...handOf(h),
        voice,
        ...base,
        role: h.role,
        number:
          h.role === 'chord'
            ? h.numbers[voice].label
            : degree(part.notes[index].midi),
      });
    }
    for (const { index, voice } of h.graces) {
      out.push({
        index,
        ...handOf(h),
        voice,
        ...base,
        role: 'approach',
        number: degree(part.notes[index].midi),
      });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

// ── Playing it over a chart ────────────────────────────────────────────────

/**
 * A number over a new chord, as semitones above its root. The chord's own
 * tone when it names one; else the chart's scale's (a ♭7 over a minor triad,
 * a maj7 over the key's 1 chord); never an avoid note, which falls to the
 * nearest chord tone. Over the very chord it was numbered on, in its own
 * key, a number is the note the player played.
 */
function realizeNumber(
  n: ChordNumber,
  chord: ChordSymbolTones,
  scale: Set<number>,
  asPlayed: boolean,
): number {
  if (asPlayed) return n.interval;
  const names = (i: number) => chord.intervals.includes(i);
  const inScale = (i: number) => scale.has(mod12(chord.rootPc + i));
  // The player's own alteration where the chord or scale allows it.
  const pick = (options: number[], ok: (i: number) => boolean) =>
    options.includes(n.interval) && ok(n.interval)
      ? n.interval
      : options.find(ok);
  const fifth = chord.fifth ?? pick([6, 8], names) ?? 7;
  switch (n.member) {
    case 'bass':
      return mod12(chord.bassPc - chord.rootPc);
    case 1:
      return 0;
    case 3:
      return chord.third ?? pick([3, 4], inScale) ?? 4;
    case 5:
      return fifth;
    case 7:
      return chord.seventh ?? pick([10, 11], inScale) ?? 0;
    case 9: {
      const named = pick(chord.third === 3 ? [1, 2] : [1, 2, 3], names);
      if (named !== undefined) return named;
      const nine = pick([2, 1], inScale);
      return nine === undefined || nine === 1 ? 0 : nine;
    }
    case 11: {
      const named = pick([5, 6], names);
      if (named !== undefined) return named;
      const eleven = pick([5, 6], inScale);
      return eleven === undefined || (eleven === 5 && chord.third === 4)
        ? fifth
        : eleven;
    }
    case 13: {
      const named = pick([9, 8], names);
      if (named !== undefined) return named;
      const thirteen = pick([9, 8], inScale);
      return thirteen === undefined || (thirteen === 8 && chord.third === 3)
        ? fifth
        : thirteen;
    }
  }
}

/** Pull toward where the player's hand was, against following its motion. */
const ANCHOR = 0.5;
/** Cost per voice of leaving the player's own inversion. */
const TURN = 1.5;
/** Hits with more voices than this keep each voice's nearest place. */
const MAX_COMBO_VOICES = 6;

/**
 * The voicing of a hit's new pitch classes nearest `aim` (where the player's
 * hand went from its last hit), pulled toward `home` (where it was played),
 * in the player's inversion unless another lies clearly nearer, low to high,
 * inside the register.
 */
function voiceHit(
  pcsByCycle: number[],
  cycle: number[],
  aim: number[],
  home: number[],
  register: Register,
): number[] {
  const size = pcsByCycle.length;
  const keep = aim.length <= 4 ? 3 : aim.length <= MAX_COMBO_VOICES ? 2 : 1;
  let best: number[] | null = null;
  let bestCost = Infinity;
  for (let turn = 0; turn < size; turn++) {
    const pcs = cycle.map((c) => pcsByCycle[(c + turn) % size]);
    // Each voice's places in the register, nearest its aim first.
    const options = pcs.map((pc, j) => {
      const places: number[] = [];
      const lowest = Math.max(register.low - STRAY, register.floor);
      for (let m = lowest; m <= register.high + STRAY; m++)
        if (mod12(m) === pc) places.push(m);
      return places
        .sort((a, b) => Math.abs(a - aim[j]) - Math.abs(b - aim[j]) || a - b)
        .slice(0, keep);
    });
    const combos = options.reduce<number[][]>(
      (all, opts) => all.flatMap((c) => opts.map((o) => [...c, o])),
      [[]],
    );
    for (const c of combos) {
      if (c.some((m, j) => j > 0 && m <= c[j - 1])) continue;
      let cost = turn ? TURN * c.length : 0;
      c.forEach((m, j) => {
        cost += Math.abs(m - aim[j]) + ANCHOR * Math.abs(m - home[j]);
        cost += OUTSIDE * Math.max(0, register.low - m, m - register.high);
      });
      if (cost < bestCost) [best, bestCost] = [c, cost];
    }
  }
  if (best) return best;
  // No order fits (a doubled tone): stack upward from the aim.
  const stacked: number[] = [];
  cycle.forEach((c, j) => {
    let m = aim[j] - mod12(aim[j] - pcsByCycle[c]);
    while (j > 0 && m <= stacked[j - 1]) m += 12;
    stacked.push(m);
  });
  return stacked;
}

/**
 * The part over a chart: its numbers played over `chordAt`'s chords in
 * `key` (tonic, Prism mode), looped from tick 0 for `ticks` ticks as a band
 * loops a part. Voice leading carries on across the loop, and each pass
 * follows the chords at its own ticks. Notes come back as written plus feel
 * (`tick` from the chart's start, `offset` kept), cut to those that sound
 * before `ticks`. Null when the part names no chords to follow from.
 */
export function followChords(
  part: InstrumentPart,
  chordAt: (tick: number) => ChordSymbolTones,
  ticks: number,
  key: PartKey,
): FollowedNote[] | null {
  const analysis = analysisOf(part);
  if (!analysis) return null;
  const { loop, hits } = analysis;
  const shift = keyShift(part.key.tonic, key.tonic);
  const chartKey = keyNotes(key);
  // A bass line's roots are the chart's bass notes: E under C/E.
  const bassLine = part.instrument === 'bass' || part.role === 'bassline';

  /** Where each line's hand last was: as realized, and as the player had it. */
  const lines = new Map<string, { at: number[]; home: number[] }>();
  /** Approaches waiting for the hit they lead into. */
  const waiting = new Map<string, { hit: Hit; pass: number }[]>();
  const out: FollowedNote[] = [];
  const keyOf = (pass: number, h: Hit) => `${pass}:${h.order}`;

  const struck = (pass: number, h: Hit) =>
    chordStruck(pass * loop + h.tick, pass * loop + h.end, chordAt);

  const emit = (
    pass: number,
    h: Hit,
    pitches: number[],
    chord: ChordSymbolTones,
  ) => {
    const start = pass * loop;
    if (start < ticks) {
      const sound = (index: number, midi: number, role: NoteRole) => {
        // Tab positions are for the notes as written, not these.
        const n: PartNote = { ...part.notes[index] };
        delete n.string;
        delete n.fret;
        if (start + playedTick(n) < ticks)
          out.push({
            ...n,
            tick: start + n.tick,
            midi,
            source: index,
            role,
            chord,
          });
      };
      h.notes.forEach(({ index, voice }) =>
        sound(index, pitches[voice], h.role),
      );
      h.graces.forEach(({ index, voice, offset }) =>
        sound(index, pitches[voice] + offset, 'approach'),
      );
    }
    // Approaches into this hit keep their half step to it.
    const leads = waiting.get(keyOf(pass, h)) ?? [];
    waiting.delete(keyOf(pass, h));
    for (const lead of leads) {
      const { voices, offsets, motion, scale } = lead.hit.approach!;
      // A diatonic approach steps through the chart's key, or its goal
      // chord's own scale.
      const steps =
        motion === 'diatonic'
          ? scale === 'goal'
            ? chordScale(chord)
            : chartKey
          : undefined;
      emit(
        lead.pass,
        lead.hit,
        voices.map((v, j) =>
          approachPitch(pitches[v], offsets[j], motion ?? 'chromatic', steps),
        ),
        struck(lead.pass, lead.hit),
      );
    }
  };

  const passes = Math.ceil(ticks / loop) + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (const h of hits) {
      const home = h.voices.map((v) => v + shift);
      // A hand that Stays in Key plays the key's degrees, whatever the chord.
      if (staysInKey(part, h.group)) {
        const pitches = h.voices.map((v) => inKey(v, part.key, key));
        lines.set(h.stream, { at: pitches, home });
        emit(pass, h, pitches, struck(pass, h));
        continue;
      }
      if (h.role === 'approach') {
        const { to, wraps } = h.approach!;
        const target = keyOf(pass + (wraps ? 1 : 0), to);
        waiting.set(target, [...(waiting.get(target) ?? []), { hit: h, pass }]);
        continue;
      }
      const chord = struck(pass, h);
      const scale = scaleUnder(chartKey, chord);
      // Over the chord it was played on, in its own key, a note is as played.
      const asPlayed = sameChord(chord, h.chord) && sameSet(scale, h.scale);
      const line = lines.get(h.stream);
      let pitches: number[];
      if (h.role === 'passing') {
        const { steps, semitones } = h.passing!;
        pitches = [
          !line
            ? asPlayed
              ? home[0]
              : nearestIn(home[0], scale)
            : asPlayed
              ? line.at[0] + semitones
              : passBy(line.at[0], steps, scale, analysis.ranges.get(h.group)!),
        ];
      } else {
        // Where the player's hand went from its last hit, from where ours is.
        const aim = line
          ? home.map((m, j) => line.at[j] + m - line.home[j])
          : home;
        const pcsByCycle: number[] = [];
        h.numbers.forEach((n, j) => {
          const root = bassLine && h.voices.length === 1 && n.member === 1;
          pcsByCycle[h.cycle[j]] = mod12(
            chord.rootPc +
              realizeNumber(
                root ? { ...n, member: 'bass' } : n,
                chord,
                scale,
                asPlayed,
              ),
          );
        });
        pitches = voiceHit(
          pcsByCycle,
          h.cycle,
          aim,
          home,
          analysis.ranges.get(h.group)!,
        );
      }
      lines.set(h.stream, { at: pitches, home });
      emit(pass, h, pitches, chord);
    }
  }
  return out;
}
