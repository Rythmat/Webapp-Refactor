import {
  InstrumentChannel,
  type MidiNoteEvent,
  type MidiSequence,
} from '../types';
import { PAD_PATTERNS } from '../data/padPatterns';
import { swingRhythm } from './rhythmUtils';

const BAR = 1920;

export function generatePadMidi(opts: {
  chordSeq: number[][];
  stringSeq: string[];
  rhythmName: string;
  swing: number;
}): MidiSequence {
  const padPattern = PAD_PATTERNS[opts.rhythmName] ?? PAD_PATTERNS['Quarters'];

  // Distribute chords to bars (4 bars total)
  const chords = opts.chordSeq;
  const barChords: number[][] = [];
  if (chords.length === 1) {
    barChords.push(chords[0], chords[0], chords[0], chords[0]);
  } else if (chords.length === 2) {
    barChords.push(chords[0], chords[1], chords[0], chords[1]);
  } else if (chords.length === 3) {
    const r = Math.floor(Math.random() * 3);
    barChords.push(chords[0], chords[1], chords[2], chords[r]);
  } else {
    for (let i = 0; i < 4; i++) barChords.push(chords[i % chords.length]);
  }

  const events: MidiNoteEvent[] = [];

  // Apply pad pattern to each bar
  for (let bar = 0; bar < 4; bar++) {
    const chord = barChords[bar];
    const barOffset = bar * BAR;

    // Apply swing to the pattern
    const swung = swingRhythm(padPattern, opts.swing);

    for (const [start, dur] of swung) {
      const absoluteTick = start + barOffset;

      // Shift chord voicing up 1 octave (+12) for pad register
      for (const note of chord) {
        const padNote = Math.min(127, note + 12);
        events.push({
          note: padNote,
          velocity: 70,
          startTick: absoluteTick,
          durationTicks: dur,
          channel: InstrumentChannel.Pad,
        });
      }
    }
  }

  return {
    ticksPerQuarterNote: 480,
    trackName: 'Pad',
    events,
  };
}
