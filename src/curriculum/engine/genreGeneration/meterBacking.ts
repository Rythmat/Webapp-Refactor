/**
 * Default play-along parts for meters other than 4/4 (ledger D-085), used
 * when a step names no designed groove, bass line or comping of its own. The
 * genre code patterns are written as 4/4 bars, so outside 4/4 they give way
 * to these plain, meter-true parts; the back office's pairings (D-084) are
 * where a style's real feel comes from.
 */

import {
  barTicks,
  beatsPerBar,
  beatTicks,
  subdivisionTicks,
  type TimeSignature,
} from '../meter';
import type { BackingNote } from './backingPatterns';
import { bassFifthMidi } from './bassFifthRule';
import { bassPC_toMidi } from './chordBassNote';
import type { ChordSymbolTones } from './chordSymbolTones';

const KICK = 36;
const SIDESTICK = 37;
const HAT = 42;

/** Kick on 1, sidestick on the other felt beats, hats on every eighth. */
export function buildMeterDrums(
  bars: number,
  ts: TimeSignature,
): BackingNote[] {
  const bar = barTicks(ts);
  const beat = beatTicks(ts);
  const sub = subdivisionTicks(ts) || beat / 2;
  const notes: BackingNote[] = [];
  for (let b = 0; b < bars; b++) {
    const o = b * bar;
    for (let t = 0; t < bar; t += sub) {
      notes.push({
        note: HAT,
        onset: o + t,
        duration: 60,
        velocity: t % beat === 0 ? 70 : 50,
        part: 'drums',
      });
    }
    notes.push({
      note: KICK,
      onset: o,
      duration: 60,
      velocity: 96,
      part: 'drums',
    });
    for (let t = beat; t < bar; t += beat) {
      notes.push({
        note: SIDESTICK,
        onset: o + t,
        duration: 60,
        velocity: 72,
        part: 'drums',
      });
    }
  }
  return notes.sort((a, b) => a.onset - b.onset);
}

/**
 * The bass: in 3/4 the vals' root on 1, then the 5 on 1 of the next bar; in
 * other meters the root on 1 and the 5 halfway through the bar's felt beats.
 * Each chord's own root and 5 (bassFifthRule).
 */
export function buildMeterBass(
  bars: number,
  ts: TimeSignature,
  chordAt: (tick: number) => ChordSymbolTones,
): BackingNote[] {
  const bar = barTicks(ts);
  const beat = beatTicks(ts);
  const beats = beatsPerBar(ts);
  const notes: BackingNote[] = [];
  for (let b = 0; b < bars; b++) {
    const o = b * bar;
    const chord = chordAt(o);
    const root = bassPC_toMidi(chord.bassPc);
    if (beats === 3) {
      // A bar of the same chord as the last plays its 5: root, 5, root, 5.
      const prev = b > 0 ? chordAt(o - bar) : null;
      const alternate = prev?.rootPc === chord.rootPc && b % 2 === 1;
      notes.push({
        note: alternate ? bassFifthMidi(chord, root) : root,
        onset: o,
        duration: beat - 20,
        velocity: 92,
        part: 'bass',
      });
      continue;
    }
    const half = Math.floor(beats / 2) * beat;
    notes.push({
      note: root,
      onset: o,
      duration: half - 20,
      velocity: 92,
      part: 'bass',
    });
    if (half > 0 && half < bar) {
      const mid = chordAt(o + half);
      notes.push({
        note: bassFifthMidi(mid, bassPC_toMidi(mid.bassPc)),
        onset: o + half,
        duration: bar - half - 20,
        velocity: 84,
        part: 'bass',
      });
    }
  }
  return notes;
}

/** Root-3-5 around C4, kept under C5 (the chord register rule). */
function voicing(chord: ChordSymbolTones): number[] {
  let base = 48 + chord.rootPc;
  while (base > 55) base -= 12;
  while (base < 44) base += 12;
  return [base, base + (chord.third ?? 12), base + (chord.fifth ?? 7)];
}

/**
 * The chords: in 3/4 the vals' "chord, chord" on 2 and 3; in other meters a
 * chord on each felt beat. A Chord Comping pairing (D-087) replaces this.
 */
export function buildMeterChords(
  bars: number,
  ts: TimeSignature,
  chordAt: (tick: number) => ChordSymbolTones,
): BackingNote[] {
  const bar = barTicks(ts);
  const beat = beatTicks(ts);
  const beats = beatsPerBar(ts);
  const notes: BackingNote[] = [];
  for (let b = 0; b < bars; b++) {
    const o = b * bar;
    for (let i = beats === 3 ? 1 : 0; i < beats; i++) {
      const t = o + i * beat;
      voicing(chordAt(t)).forEach((note) =>
        notes.push({
          note,
          onset: t,
          duration: Math.round(beat * 0.6),
          velocity: 64,
          part: 'chords',
        }),
      );
    }
  }
  return notes;
}
