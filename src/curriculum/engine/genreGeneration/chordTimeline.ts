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

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * Onsets where the targets strike two or more pitch classes, in order, repeats
 * dropped. When the part has a bass voice, only strikes over a bass note count.
 */
function targetChordHits(notes: readonly GenreNoteEvent[]): Hit[] {
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
  const withBass = strikes.some((hit) => hit.bassPc !== null);
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

/** Which symbol each hit plays: the current chord, the next one in order, or the best match. */
function assignSymbols(
  chords: (Chord | null)[],
  hits: Hit[],
): (number | null)[] {
  const assigned: (number | null)[] = [];
  let current = -1;
  for (const hit of hits) {
    // 0 when the chord doesn't match the hit; otherwise its fit, plus a bonus
    // when the hit's bass note is the chord's bass.
    const score = (i: number) => {
      const chord = chords[i];
      if (!chord) return 0;
      const fit = chordFit(hit.pcs, chord);
      const bassMatch = hit.bassPc !== null && hit.bassPc === chord.bassPc;
      if (fit < (bassMatch ? 0.5 : MATCH)) return 0;
      return fit + (bassMatch ? BASS_BONUS : 0);
    };
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
  return assigned;
}

function matchTargets(
  chords: (Chord | null)[],
  hits: Hit[],
): TimedChord[] | null {
  if (hits.length < 2) return null;
  const assigned = assignSymbols(chords, hits);
  const matched = assigned.filter((i) => i !== null).length;
  if (matched * 2 < hits.length) return null;

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
    timeline.push({ ...chord, tick: timeline.length ? hit.tick : 0 });
    last = index;
  });
  return timeline;
}

function perBar(chords: (Chord | null)[], bars: number): TimedChord[] {
  const timeline: TimedChord[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[bar % chords.length];
    if (chord) timeline.push({ ...chord, tick: bar * BAR_TICKS });
  }
  return timeline;
}

/** The step's chord timeline over `bars` bars; empty without chord symbols. */
export function buildChordTimeline(
  symbols: readonly string[] | undefined,
  targetNotes: readonly GenreNoteEvent[],
  bars: number,
): TimedChord[] {
  if (!symbols?.length) return [];
  const chords = symbols.map((symbol) => {
    const tones = chordSymbolTones(symbol);
    return tones ? { ...tones, symbol } : null;
  });
  return (
    matchTargets(chords, targetChordHits(targetNotes)) ?? perBar(chords, bars)
  );
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
