import {
  InstrumentChannel,
  type BassPattern,
  type GenreName,
  type MidiNoteEvent,
  type MidiSequence,
  type ModeName,
  type RhythmHit,
} from '../types';
import { BASS_PATTERNS } from '../data/bassPatterns';
import { GENRE_MAP } from '../data/genreMap';
import { CHORD_COLORS, COLOR_TO_MODE } from '../data/keyColors';
import { MODES } from '../data/modes';
import { swingRhythm } from './rhythmUtils';

const BAR = 1920;
const TWO_BAR = 3840;

/**
 * Distributes an array of items across exactly 4 bar slots.
 *
 * - 1 item  → A A A A
 * - 2 items → A B A B
 * - 3 items → A B C random(A|B|C)
 * - 4+ items → round-robin
 */
function distributeToFourBars<T>(items: T[]): [T, T, T, T] {
  if (items.length === 0) {
    throw new Error('distributeToFourBars: empty input');
  }
  if (items.length === 1) {
    return [items[0], items[0], items[0], items[0]];
  }
  if (items.length === 2) {
    return [items[0], items[1], items[0], items[1]];
  }
  if (items.length === 3) {
    const r = Math.floor(Math.random() * 3);
    return [items[0], items[1], items[2], items[r]];
  }
  // 4 or more: round-robin the first 4
  return [
    items[0 % items.length],
    items[1 % items.length],
    items[2 % items.length],
    items[3 % items.length],
  ];
}

/**
 * Resolves a chord string (e.g. "1 major") into a mode scale interval array.
 * Falls back to ionian if the chord color or mode cannot be resolved.
 */
function resolveMode(chordStr: string): number[] {
  const colorRef = CHORD_COLORS[chordStr] ?? 0;
  const modeName: ModeName | undefined = COLOR_TO_MODE[colorRef];
  if (modeName && MODES[modeName]) {
    return MODES[modeName];
  }
  // Fallback: ionian
  return MODES.ionian;
}

/**
 * Converts a scale degree (positive or negative) into a semitone offset
 * from the chord root using the given mode intervals.
 *
 * Positive degrees index directly into the mode:
 *   0 → root (0 semitones), 1 → 2nd, 2 → 3rd, ... 6 → 7th
 *   Values >6 wrap with octave offset.
 *
 * Negative degrees go below the root:
 *   -4 → -(mode[4]) semitones = 5th below root
 */
function degreesToSemitones(scaleDegree: number, mode: number[]): number {
  if (scaleDegree >= 0) {
    const deg = scaleDegree % 7;
    const octaveUp = Math.floor(scaleDegree / 7) * 12;
    return mode[deg] + octaveUp;
  }
  const abs = Math.abs(scaleDegree);
  const deg = abs % 7;
  const octaveDown = Math.floor(abs / 7) * 12;
  return -(mode[deg] + octaveDown);
}

/**
 * Generates a bass MIDI sequence for a 4-bar section.
 *
 * The generator:
 * 1. Looks up the genre from the rhythm name to select bass patterns
 * 2. Distributes chords across 4 bars (matching distributeChords logic)
 * 3. Loops the 2-bar bass pattern twice (bars 1-2, bars 3-4)
 * 4. For each bass hit, resolves the scale degree against the active
 *    chord's mode to produce a concrete MIDI note
 * 5. Applies swing timing
 *
 * The bass is placed 2 octaves below each chord root.
 */
export function generateBassMidi(opts: {
  chordSeq: number[][];
  stringSeq: string[];
  root: number;
  rhythmName: string;
  swing: number;
}): MidiSequence {
  const genre: GenreName = GENRE_MAP[opts.rhythmName] ?? 'Pop';
  const variants = BASS_PATTERNS[genre];
  const bassPattern: BassPattern = variants[0]; // use first variant

  // Distribute chords and chord names across 4 bars
  const barChords = distributeToFourBars(opts.chordSeq);
  const barStrings = distributeToFourBars(opts.stringSeq);

  const events: MidiNoteEvent[] = [];

  // Loop the 2-bar pattern twice to fill 4 bars
  for (let loop = 0; loop < 2; loop++) {
    const barOffset = loop * 2; // bars 0-1 for loop 0, bars 2-3 for loop 1
    const tickOffset = loop * TWO_BAR;

    for (const [start, dur, scaleDegree] of bassPattern) {
      const absoluteTick = start + tickOffset;

      // Determine which bar this hit falls in (0-3)
      const barIdx = barOffset + Math.floor(start / BAR);
      if (barIdx >= 4) continue;

      const chord = barChords[barIdx];
      const chordStr = barStrings[barIdx] || '1 major';

      // Use lowest note in chord as root reference
      const chordRoot = chord[0];

      // Resolve mode from chord name
      const mode = resolveMode(chordStr);

      // Convert scale degree to semitone offset
      const semitones = degreesToSemitones(scaleDegree, mode);

      // Place bass 2 octaves below chord voicing root
      const midiNote = Math.max(0, Math.min(127, chordRoot - 24 + semitones));

      // Apply swing to this individual hit
      const swung = swingRhythm(
        [[absoluteTick, dur]] as RhythmHit[],
        opts.swing,
      );

      events.push({
        note: midiNote,
        velocity: 95,
        startTick: swung[0][0],
        durationTicks: swung[0][1],
        channel: InstrumentChannel.Bass,
      });
    }
  }

  return {
    ticksPerQuarterNote: 480,
    trackName: 'Bass',
    events,
  };
}
