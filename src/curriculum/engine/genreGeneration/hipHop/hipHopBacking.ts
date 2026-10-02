/**
 * hipHopBacking.ts — Hip Hop play-along drums, bass and chords.
 *
 * A Hip Hop step names its patterns: `grooveId` is a drum pattern id and
 * `backing_style` names the bass pattern and chord rhythm (hipHopPatterns.ts).
 * The builders here turn those into backing notes over the step's chords.
 * Swing is applied afterwards by `buildBackingNotes`, as for every genre.
 */

import type { BackingNote } from '../backingPatterns';
import type { ChordSymbolTones } from '../chordSymbolTones';
import {
  BAR_TICKS,
  DRUM_NOTES,
  HIPHOP_BASS,
  HIPHOP_COMPING,
  HIPHOP_DRUMS,
  OPEN_HAT,
  TICKS_PER_16TH,
  type BassTone,
  type DrumPattern,
  type DrumVoice,
} from './hipHopPatterns';

/** A step with no drum pattern named plays its level's groove. */
const LEVEL_GROOVE: Record<number, string> = {
  1: 'trap_a',
  2: 'boombap_a',
  3: 'boombap_b',
};

export function hipHopDrumPattern(
  grooveId: string | undefined,
  level: number,
): DrumPattern {
  return (
    (grooveId && HIPHOP_DRUMS[grooveId]) ||
    HIPHOP_DRUMS[LEVEL_GROOVE[level] ?? 'trap_a']
  );
}

// ── Drums ────────────────────────────────────────────────────────────────────

const HIT_VELOCITY: Record<string, number> = {
  x: 96,
  X: 112,
  g: 38,
  o: 88,
  r: 70,
  t: 64,
};

export function buildHipHopDrums(
  bars: number,
  pattern: DrumPattern,
): BackingNote[] {
  const notes: BackingNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const grid = pattern.bars[bar % pattern.bars.length];
    (Object.keys(grid) as DrumVoice[]).forEach((voice) => {
      [...(grid[voice] ?? '')].forEach((ch, step) => {
        if (ch === '.') return;
        const onset = bar * BAR_TICKS + step * TICKS_PER_16TH;
        const note =
          voice === 'hat' && ch === 'o' ? OPEN_HAT : DRUM_NOTES[voice];
        const velocity = HIT_VELOCITY[ch] ?? 90;
        const count = ch === 'r' ? 2 : ch === 't' ? 3 : 1;
        for (let i = 0; i < count; i++) {
          notes.push({
            note,
            onset: onset + Math.round((i * TICKS_PER_16TH) / count),
            duration: 60,
            velocity: i === 0 ? velocity : velocity - 12,
            part: 'drums',
          });
        }
      });
    });
  }
  return notes;
}

// ── Bass ─────────────────────────────────────────────────────────────────────

/** Where a bass root may sit: C1 to G2. */
const BASS_LOW = 24;
const BASS_HIGH = 43;

/**
 * The root's MIDI note, moving by the nearest step from the previous root —
 * E down to D is a whole step, never the 7th leap up (ledger D-033). The first
 * root sits between E1 and E♭2, like the rest of the lesson engine.
 */
function nearestRoot(pc: number, previous: number | null): number {
  const home = 28 + ((pc - 4 + 12) % 12);
  if (previous === null) return home;
  const candidates = [home - 12, home, home + 12].filter(
    (n) => n >= BASS_LOW && n <= BASS_HIGH,
  );
  return candidates.reduce((best, n) =>
    Math.abs(n - previous) < Math.abs(best - previous) ? n : best,
  );
}

const TONE_SEMITONES: Record<Exclude<BassTone, 'R'>, number> = {
  '5': 7,
  '8': 12,
  b3: 3,
  b6: 8,
  b7: 10,
  '7': 11,
};

export interface HipHopBassOptions {
  /** Moves the whole line by octaves (e.g. -12 to start D♯ at D♯1). */
  offset?: number;
}

export function buildHipHopBass(
  bars: number,
  patternId: string,
  drums: DrumPattern,
  chordAt: (tick: number) => ChordSymbolTones,
  options: HipHopBassOptions = {},
): BackingNote[] {
  const pattern = HIPHOP_BASS[patternId];
  if (!pattern) return [];
  const offset = options.offset ?? 0;

  // Each chord's bass root, placed by nearest motion as the chords change.
  let lastRoot: number | null = null;
  let lastChord: ChordSymbolTones | null = null;
  const rootAt = (tick: number): { chord: ChordSymbolTones; root: number } => {
    const chord = chordAt(tick);
    if (chord !== lastChord || lastRoot === null) {
      lastRoot = nearestRoot(chord.bassPc, lastRoot);
      lastChord = chord;
    }
    return { chord, root: lastRoot };
  };
  const toneNote = (tick: number, tone: BassTone): number => {
    const { chord, root } = rootAt(tick);
    if (tone === 'R') return root + offset;
    // Degrees count from the chord root; over a slash bass, measure from it.
    const above = (chord.rootPc - chord.bassPc + 12) % 12;
    return root + above + TONE_SEMITONES[tone] + offset;
  };

  const notes: BackingNote[] = [];
  const loopEnd = bars * BAR_TICKS;

  if (pattern.follow === 'kick') {
    const kicks: number[] = [];
    for (let bar = 0; bar < bars; bar++) {
      const row =
        drums.bars[bar % drums.bars.length].kick ?? 'x.......x.......';
      [...row].forEach((ch, step) => {
        if (ch !== '.') kicks.push(bar * BAR_TICKS + step * TICKS_PER_16TH);
      });
    }
    kicks.forEach((onset, i) => {
      const next = kicks[i + 1] ?? loopEnd;
      notes.push({
        note: toneNote(onset, 'R'),
        onset,
        duration: Math.min(next - onset - 20, 1400),
        velocity: onset % BAR_TICKS === 0 ? 104 : 92,
        part: 'bass',
      });
    });
    return notes;
  }

  let previous: number | undefined;
  for (let bar = 0; bar < bars; bar++) {
    const hits = pattern.bars![bar % pattern.bars!.length];
    for (const hit of hits) {
      const onset = bar * BAR_TICKS + hit.step * TICKS_PER_16TH;
      const note = toneNote(onset, hit.tone);
      notes.push({
        note,
        onset,
        duration: hit.dur,
        velocity: hit.step === 0 ? 104 : 90,
        part: 'bass',
        ...(hit.glide && previous !== undefined ? { glideFrom: previous } : {}),
      });
      previous = note;
    }
  }
  return notes;
}

// ── Chords ───────────────────────────────────────────────────────────────────

/**
 * Each chord tone placed in the octave above `register`, so successive chords
 * keep their common tones and move by the smallest steps.
 */
function voiceChord(chord: ChordSymbolTones, register: number): number[] {
  return chord.intervals
    .map((iv) => register + ((chord.rootPc + iv - register + 120) % 12))
    .sort((a, b) => a - b);
}

export function buildHipHopChords(
  bars: number,
  compingId: string,
  chordAt: (tick: number) => ChordSymbolTones,
  register: number,
): BackingNote[] {
  const pattern = HIPHOP_COMPING[compingId];
  if (!pattern) return [];
  const notes: BackingNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const hits = pattern.bars[bar % pattern.bars.length];
    for (const hit of hits) {
      const onset = bar * BAR_TICKS + hit.step * TICKS_PER_16TH;
      for (const note of voiceChord(chordAt(onset), register)) {
        notes.push({
          note,
          onset,
          duration: hit.dur,
          velocity: hit.step === 0 ? 78 : 68,
          part: 'chords',
        });
      }
    }
  }
  return notes;
}
