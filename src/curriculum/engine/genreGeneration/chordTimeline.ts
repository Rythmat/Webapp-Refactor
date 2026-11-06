/**
 * chordTimeline.ts — When each chord of a step's progression sounds.
 *
 * `chordSymbols` lists a step's chords in order but not when they change. When
 * the student's target notes play chords, the timeline follows them: each change
 * in the target harmony is matched to its symbol, so a chord that arrives
 * mid-bar (Am9 → Eb9 on beat 4 → D9 on the last 16th) sounds in the backing
 * exactly where the student plays it. A brief chord that fits none of the
 * symbols — a chromatic approach stab — belongs to the chord it leads into.
 * A bass note under the chords (a moving bass line, a left-hand bass part)
 * names the chord's bass and outweighs the upper voices.
 * Steps whose targets are a single line (melody, bass) get one chord per bar.
 *
 * A caller that knows its own chord changes (Echo's Make Your Song: the
 * student's chords take, changing at the half bar) gives them with their
 * ticks instead (`timedChordTimeline`), and the backing follows them.
 */

import { chordSymbolTones, type ChordSymbolTones } from './chordSymbolTones';
import type { GenreNoteEvent } from './resolveStepContent';

export interface TimedChord extends ChordSymbolTones {
  /** Tick, from the step's bar 1, where this chord starts sounding. */
  tick: number;
  symbol: string;
}

type Chord = ChordSymbolTones & { symbol: string };
type Hit = { tick: number; pcs: Set<number>; bassPc: number | null };
/** What the timeline reads of a target note. */
type TargetNote = Pick<GenreNoteEvent, 'onset' | 'midi'>;

const BAR_TICKS = 1920;
/** Share of a target chord's pitch classes a symbol must contain to count as it. */
const MATCH = 0.75;

function chordFit(pcs: ReadonlySet<number>, chord: Chord): number {
  const tones = new Set(chord.intervals.map((i) => (chord.rootPc + i) % 12));
  tones.add(chord.bassPc);
  let hits = 0;
  pcs.forEach((pc) => {
    if (tones.has(pc)) hits += 1;
  });
  return hits / pcs.size;
}

const sameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>) =>
  a.size === b.size && [...a].every((pc) => b.has(pc));

/** A lowest note at least this far below the next one is a bass voice. */
const BASS_GAP = 10;
/** Extra weight for a symbol whose bass is the hit's bass note. */
const BASS_BONUS = 0.6;
/**
 * A tie-breaker: extra weight for a symbol whose guide tones (3rd and 7th)
 * the hit plays. Jazz voicings fit more than one symbol — G13 holds all of
 * Cmaj9's E–B–D — and the chord whose 3rd and 7th sound is the one played.
 */
const GUIDE_BONUS = 0.05;

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * Onsets where the targets strike two or more pitch classes, in order, repeats
 * dropped. When the part has a bass voice, only strikes over a bass note count
 * — unless `everyStrike`: a right hand can change chord between bass notes
 * (Asus2 → Am on beat 3), or play its first chord over a bass too close to
 * count as one (B♭/D: D3 under B♭3).
 */
function targetChordHits(
  notes: readonly TargetNote[],
  everyStrike = false,
): Hit[] {
  const byOnset = new Map<number, number[]>();
  for (const note of notes) {
    byOnset.set(note.onset, [...(byOnset.get(note.onset) ?? []), note.midi]);
  }
  const strikes: Hit[] = [];
  for (const [tick, midis] of [...byOnset].sort(([a], [b]) => a - b)) {
    const pcs = new Set(midis.map(pitchClass));
    if (pcs.size < 2) continue;
    const [lowest, above] = [...new Set(midis)].sort((a, b) => a - b);
    const bassPc = above - lowest >= BASS_GAP ? pitchClass(lowest) : null;
    strikes.push({ tick, pcs, bassPc });
  }
  const withBass = !everyStrike && strikes.some((hit) => hit.bassPc !== null);
  const hits: Hit[] = [];
  for (const hit of withBass
    ? strikes.filter((s) => s.bassPc !== null)
    : strikes) {
    const previous = hits[hits.length - 1];
    if (
      previous &&
      previous.bassPc === hit.bassPc &&
      sameSet(previous.pcs, hit.pcs)
    )
      continue;
    hits.push(hit);
  }
  return hits;
}

/**
 * How well a chord names a hit: 0 when it doesn't match; otherwise its fit,
 * plus a bonus when the hit's bass note is the chord's bass.
 */
function hitScore(hit: Hit, chord: Chord | null): number {
  if (!chord) return 0;
  const fit = chordFit(hit.pcs, chord);
  const bassMatch = hit.bassPc !== null && hit.bassPc === chord.bassPc;
  if (fit < (bassMatch ? 0.5 : MATCH)) return 0;
  const guides = [chord.third, chord.seventh]
    .filter((i): i is number => i !== undefined)
    .map((i) => (chord.rootPc + i) % 12);
  const guided = guides.length > 0 && guides.every((pc) => hit.pcs.has(pc));
  return fit + (bassMatch ? BASS_BONUS : 0) + (guided ? GUIDE_BONUS : 0);
}

/**
 * Which symbol each hit plays: the current chord, the next one in order, or the
 * best match. A change then starts as early as the notes allow: a strike just
 * before it that the new chord fits as well as the old one is the new chord's
 * — a melody note on the downbeat can make Dm7 and G7 fit D-F-B-A alike, and
 * the G7 shell is already there under it.
 */
function assignSymbols(
  chords: (Chord | null)[],
  hits: readonly Hit[],
): (number | null)[] {
  const assigned: (number | null)[] = [];
  let current = -1;
  for (const hit of hits) {
    const score = (i: number) => hitScore(hit, chords[i]);
    const next = (current + 1) % chords.length;
    let pick: number | null = null;
    if (current >= 0 && score(current) > 0 && score(current) >= score(next)) {
      pick = current;
    } else if (score(next) > 0) {
      pick = next;
    } else {
      for (let i = 0; i < chords.length; i++) {
        if (score(i) > 0 && (pick === null || score(i) > score(pick))) pick = i;
      }
    }
    assigned.push(pick);
    if (pick !== null) current = pick;
  }

  for (let i = 1; i < assigned.length; i++) {
    const before = assigned[i - 1];
    const after = assigned[i];
    if (before === null || after === null || before === after) continue;
    // Never past the old chord's own first strike: it keeps at least one.
    for (let j = i - 1; j > 0 && assigned[j - 1] === before; j--) {
      const old = hitScore(hits[j], chords[before]);
      if (hitScore(hits[j], chords[after]) < old) break;
      assigned[j] = after;
    }
  }
  return assigned;
}

/**
 * Unmatched hits where the progression's skipped chords belong: a run of
 * them between two matched chords takes, in order, the chords the symbols
 * list between those two — a G7 voiced B–F–A (3-7-9) fits no symbol, but
 * between Dm7 and Cmaj7 it is the G7. A run before the first match takes the
 * chords listed before it, one after the last those listed after. Hits past
 * the skipped chords are left to the approach rule.
 */
function fillSkipped(
  assigned: (number | null)[],
  chords: readonly (Chord | null)[],
): void {
  for (let i = 0; i < assigned.length; ) {
    if (assigned[i] !== null) {
      i++;
      continue;
    }
    const start = i;
    while (i < assigned.length && assigned[i] === null) i++;
    const before = start > 0 ? assigned[start - 1] : null;
    const after = i < assigned.length ? assigned[i] : null;
    const from = before === null ? 0 : before + 1;
    const to = after === null ? chords.length : after;
    const skipped: number[] = [];
    for (let c = from; c < to; c++) if (chords[c]) skipped.push(c);
    skipped.slice(0, i - start).forEach((c, k) => {
      assigned[start + k] = c;
    });
  }
}

function matchTargets(
  chords: (Chord | null)[],
  hits: readonly Hit[],
): TimedChord[] | null {
  if (hits.length < 2) return null;
  const assigned = assignSymbols(chords, hits);
  const matched = assigned.filter((i) => i !== null).length;
  if (matched * 2 < hits.length) return null;

  fillSkipped(assigned, chords);
  // An unmatched chord (an approach stab) takes the chord it leads into.
  for (let i = assigned.length - 2; i >= 0; i--) {
    if (assigned[i] === null) assigned[i] = assigned[i + 1];
  }
  for (let i = 1; i < assigned.length; i++) {
    if (assigned[i] === null) assigned[i] = assigned[i - 1];
  }

  const timeline: TimedChord[] = [];
  let last: number | null = null;
  hits.forEach((hit, i) => {
    const index = assigned[i];
    const chord = index === null ? null : chords[index];
    if (index === last || !chord) return;
    timeline.push({ ...chord, tick: hit.tick });
    last = index;
  });
  return timeline;
}

function perBar(
  chords: (Chord | null)[],
  bars: number,
  barLength: number,
): TimedChord[] {
  const timeline: TimedChord[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[bar % chords.length];
    if (chord) timeline.push({ ...chord, tick: bar * barLength });
  }
  return timeline;
}

const toChords = (symbols: readonly string[]): (Chord | null)[] =>
  symbols.map((symbol) => {
    const tones = chordSymbolTones(symbol);
    return tones ? { ...tones, symbol } : null;
  });

/** How many of the progression's chords a timeline names. */
const named = (timeline: readonly TimedChord[] | null) =>
  new Set(timeline?.map((chord) => chord.symbol)).size;

/**
 * Where the target notes strike each chord: every change in the harmony they
 * play, at its own onset, matched to its symbol. Read from the strikes over a
 * bass note, or from every strike when that names more of the progression.
 * Null when the targets don't play the progression — a single line, or
 * strikes too few symbols fit. What the backing plays and the chord symbols
 * over the staff sit on (lessonChordSymbols.ts).
 */
export function chordStrikes(
  symbols: readonly string[] | undefined,
  targetNotes: readonly TargetNote[],
): TimedChord[] | null {
  if (!symbols?.length) return null;
  // A chord listed again straight after itself is held, not a new change
  // (two a bar: C13 C13 | Gm9 C13).
  const chords = toChords(
    symbols.filter((s, i) => i === 0 || symbols[i - 1] !== s),
  );
  const overBass = matchTargets(chords, targetChordHits(targetNotes));
  const every = matchTargets(chords, targetChordHits(targetNotes, true));
  return named(every) > named(overBass) ? every : overBass;
}

/**
 * Struck chords where a lead sheet puts them, over the measures: the first
 * chord from the downbeat, and a bar's first change on that bar's downbeat
 * even when its notes come later (a bolero's "and", a groove's beat 3). A
 * change later in a bar keeps its own strike (Am9 → D13 on beat 3).
 */
export function onTheBar<T extends { tick: number }>(
  chords: readonly T[],
  barLength = BAR_TICKS,
): T[] {
  return chords.map((chord, i) => {
    if (i === 0) return { ...chord, tick: 0 };
    const downbeat = Math.floor(chord.tick / barLength) * barLength;
    return chords[i - 1].tick < downbeat ? { ...chord, tick: downbeat } : chord;
  });
}

/**
 * The step's chord timeline over `bars` bars; empty without chord symbols.
 * `barLength` is the meter's bar in ticks (engine/meter.ts barTicks). Struck
 * chords change where the staff writes them (`onTheBar`), so the band plays a
 * bar's new chord from its downbeat.
 */
export function buildChordTimeline(
  symbols: readonly string[] | undefined,
  targetNotes: readonly TargetNote[],
  bars: number,
  barLength = BAR_TICKS,
): TimedChord[] {
  if (!symbols?.length) return [];
  const struck = chordStrikes(symbols, targetNotes);
  if (struck) return onTheBar(struck, barLength);
  return perBar(toChords(symbols), bars, barLength);
}

/** A chord change a caller times itself: where it starts, and its symbol. */
export interface ChordChange {
  tick: number;
  symbol: string;
}

/**
 * Chords a caller times itself: one pass of changes, in ticks from the
 * downbeat, repeated every `length` ticks (a song's eight bars over a
 * sixteen-bar backing).
 */
export interface TimedChords {
  changes: readonly ChordChange[];
  length: number;
}

/**
 * A step's symbols two to a bar (`chordsPerBar: 2`): each lasts half a bar,
 * as changes timed for `timedChordTimeline`.
 */
export function halfBarChords(
  symbols: readonly string[],
  barLength = BAR_TICKS,
): TimedChords {
  const half = barLength / 2;
  return {
    changes: symbols.map((symbol, i) => ({ tick: i * half, symbol })),
    length: symbols.length * half,
  };
}

/**
 * A timeline from changes the caller timed, over `bars` bars: each pass of
 * them repeated every `length` ticks, a symbol no chord can be read from
 * left out (the chord before it plays on), a chord repeated where it
 * already sounds left out, and the first sounding from the downbeat. Empty
 * when no change can be read.
 */
export function timedChordTimeline(
  timed: TimedChords,
  bars: number,
  barLength = BAR_TICKS,
): TimedChord[] {
  const total = bars * barLength;
  const pass = [...timed.changes]
    .filter((change) => change.tick >= 0 && change.tick < timed.length)
    .sort((a, b) => a.tick - b.tick)
    .flatMap((change) => {
      const tones = chordSymbolTones(change.symbol);
      return tones
        ? [{ ...tones, symbol: change.symbol, tick: change.tick }]
        : [];
    });
  if (pass.length === 0 || !(timed.length > 0)) return [];
  const timeline: TimedChord[] = [];
  for (let start = 0; start < total; start += timed.length) {
    for (const chord of pass) {
      const tick = start + chord.tick;
      if (tick >= total) break;
      const last = timeline[timeline.length - 1];
      if (last?.symbol === chord.symbol) continue;
      timeline.push({ ...chord, tick: last ? tick : 0 });
    }
  }
  return timeline;
}

/** The chord sounding at `tick`, or null before the first one. */
export function chordAtTick(
  timeline: readonly TimedChord[],
  tick: number,
): TimedChord | null {
  let sounding: TimedChord | null = null;
  for (const chord of timeline) {
    if (chord.tick > tick) break;
    sounding = chord;
  }
  return sounding;
}
