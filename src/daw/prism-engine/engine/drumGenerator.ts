import type { MidiNoteEvent, MidiSequence, GenreName } from '../types';
import { InstrumentChannel, DrumNote } from '../types';
import { DRUM_PATTERNS } from '../data/drumPatterns';
import { GENRE_MAP } from '../data/genreMap';
import { swingRhythm } from './rhythmUtils';

const TWO_BAR = 3840; // 2 bars in ticks (480 * 4 * 2)

/** Default velocity for each drum element */
const VELOCITY: Record<string, number> = {
  kick: 110,
  snare: 100,
  hihat: 80,
  ride: 85,
  crash: 100,
  tomHigh: 95,
  tomLow: 95,
};

/** Map drum element name to MIDI note */
const NOTE_MAP: Record<string, number> = {
  kick: DrumNote.Kick,
  snare: DrumNote.Snare,
  hihat: DrumNote.HiHatClosed,
  ride: DrumNote.RideCymbal,
  crash: DrumNote.Crash,
  tomHigh: DrumNote.TomHigh,
  tomLow: DrumNote.TomLow,
};

/**
 * Generates a drum MIDI sequence for the given rhythm/genre.
 *
 * The base drum patterns are 2 bars long and get looped to fill
 * the requested bar count. Swing is applied to hi-hat and ride
 * elements only (kick and snare stay on the grid for punch).
 */
export function generateDrumMidi(opts: {
  rhythmName: string;
  swing: number;
  bars?: number;
}): MidiSequence {
  const bars = opts.bars ?? 4;
  const genre: GenreName = GENRE_MAP[opts.rhythmName] ?? 'Pop';
  const pattern = DRUM_PATTERNS[genre];
  const loops = Math.ceil(bars / 2);

  const events: MidiNoteEvent[] = [];

  for (const [element, hits] of Object.entries(pattern)) {
    if (!hits || hits.length === 0) continue;

    const drumNote = NOTE_MAP[element];
    if (drumNote === undefined) continue;
    const vel = VELOCITY[element] ?? 90;

    // Apply swing to hihat and ride only
    const processed = (element === 'hihat' || element === 'ride')
      ? swingRhythm(hits, opts.swing)
      : hits;

    for (let loop = 0; loop < loops; loop++) {
      const offset = loop * TWO_BAR;
      for (const [start, dur] of processed) {
        events.push({
          note: drumNote,
          velocity: vel,
          startTick: start + offset,
          durationTicks: dur,
          channel: InstrumentChannel.Drums,
        });
      }
    }
  }

  return {
    ticksPerQuarterNote: 480,
    trackName: 'Drums',
    events,
  };
}
