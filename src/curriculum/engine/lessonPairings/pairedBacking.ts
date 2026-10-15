/**
 * A lesson pairing's drums and bass as backing notes (ledger D-084). The
 * paired groove plays as designed; the paired bass line is realized over the
 * step's own chords by the Bass Lines generator, so one line fits every
 * progression in the style.
 */

import { realizeLine, type BassLine } from '../bassLines/bassLine';
import type { Chord, Quality, TimeSignature } from '../bassLines/harmony';
import { buildDesignedDrums } from '../drumGrooves/drumGroove';
import type { BackingNote } from '../genreGeneration/backingPatterns';
import type { ChordSymbolTones } from '../genreGeneration/chordSymbolTones';
import type { BassVoiceId } from '../genreGeneration/genreBassVoices';
import type { ResolvedPairing } from './registry';

const PPQ = 480;
/** Chord lookups per bar: 16ths, fine enough for any mid-bar change. */
const SLOTS_PER_BAR = 16;

/**
 * The bass generator's quality for a lesson chord, read from its intervals
 * rather than its symbol, so Music Atlas spellings (funk9, "6 min") never
 * trip the parser. Extensions fold into the seventh chord they extend.
 */
export function qualityFromIntervals(intervals: readonly number[]): Quality {
  // Tensions are written above the octave (13 = ♭9); read them as pitch classes.
  const pcs = new Set(intervals.map((i) => ((i % 12) + 12) % 12));
  const has = (i: number) => pcs.has(i);
  // A ♯9 (3) beside a major third is a tension, not a minor third.
  const minor3 = has(3) && !has(4);
  const major3 = has(4);
  const flat7 = has(10);
  const maj7 = has(11);
  if (minor3 && has(6)) return has(9) ? 'dim7' : flat7 ? 'm7b5' : 'dim';
  if (major3 && has(8) && !has(7)) return 'aug';
  if (!minor3 && !major3) return flat7 ? '7sus' : 'sus';
  if (minor3) {
    if (maj7) return 'mMaj7';
    if (flat7) return 'm7';
    return has(9) ? 'm6' : 'min';
  }
  if (flat7) return has(1) ? '7b9' : '7';
  if (maj7) return 'maj7';
  return has(9) ? '6' : 'maj';
}

export function chordFromTones(tones: ChordSymbolTones): Chord {
  return {
    root: tones.rootPc,
    quality: qualityFromIntervals(tones.intervals),
    bass: tones.bassPc !== tones.rootPc ? tones.bassPc : null,
  };
}

/** The pairing's groove across the backing, unswung (the caller swings). */
export function pairedDrumNotes(
  drums: NonNullable<ResolvedPairing['drums']>,
  bars: number,
  barTicks: number,
): BackingNote[] {
  return buildDesignedDrums(drums, bars, barTicks);
}

/**
 * The pairing's bass line over the step's chords, unswung. `chordAt` is the
 * backing's chord lookup (the step's chord timeline, else the tonic).
 */
export function pairedBassNotes(
  line: BassLine,
  chordAt: (tick: number) => ChordSymbolTones,
  bars: number,
  timeSignature: TimeSignature = [4, 4],
): BackingNote[] {
  const barTicks = Math.round((timeSignature[0] * PPQ * 4) / timeSignature[1]);
  const slot = barTicks / SLOTS_PER_BAR;
  const chart: Chord[][] = Array.from({ length: bars }, (_, b) =>
    Array.from({ length: SLOTS_PER_BAR }, (_, i) =>
      chordFromTones(chordAt(Math.round(b * barTicks + i * slot))),
    ),
  );
  const realized = realizeLine(line, chart, { timeSignature });
  return realized.notes.map((n) => ({
    note: n.midi,
    onset: Math.round(n.q * PPQ),
    duration: Math.max(1, Math.round(n.dur * PPQ)),
    velocity: Math.max(1, Math.min(127, Math.round(n.velocity * 127))),
    part: 'bass' as const,
  }));
}

/**
 * The lesson bass voice for a paired line's instrument. The Bass Lines editor
 * previews on its own samples; lessons and the Studio play their FluidR3
 * voices, so a line sounds on the nearest one.
 */
export function pairedBassVoice(line: BassLine): BassVoiceId {
  return line.instrument === 'electric' ? 'finger' : 'upright';
}
