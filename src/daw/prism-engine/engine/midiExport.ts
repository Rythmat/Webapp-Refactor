import {
  StrumMode,
  VelocityTilt,
  type ChordMidiOptions,
  type MelodyMidiOptions,
  type MidiNoteEvent,
  type MidiSequence,
  type RhythmHit,
} from '../types';
import { normalizeSequence } from './chordUtils';
import { swingRhythm } from './rhythmUtils';
import { getChordMelody } from './melodyGenerator';
import { MELODY_RHYTHMS } from '../data/melodyRhythms';

const BAR = 1920; // ticks per bar (480 * 4)

/**
 * Distributes a variable-length chord sequence across 4 bars of rhythm hits.
 * Returns an array of [startTick, durationTicks, chordNotes] tuples.
 *
 * Logic mirrors DraggableFile.cpp:
 * - 2 chords → A B A B
 * - 3 chords → A B C random(A|B|C)
 * - 4 chords → A B C D
 * - >4 chords → split bars in half to fit extras
 */
export function distributeChords(
  chords: number[][],
  hits: RhythmHit[],
): [number, number, number[]][] {
  const data: [number, number, number[]][] = [];

  if (chords.length === 2) {
    for (const hit of hits) {
      data.push([hit[0], hit[1], chords[0]]);
      data.push([hit[0] + BAR, hit[1], chords[1]]);
      data.push([hit[0] + BAR * 2, hit[1], chords[0]]);
      data.push([hit[0] + BAR * 3, hit[1], chords[1]]);
    }
  } else if (chords.length === 3) {
    const rando = Math.floor(Math.random() * 3);
    for (const hit of hits) {
      data.push([hit[0], hit[1], chords[0]]);
      data.push([hit[0] + BAR, hit[1], chords[1]]);
      data.push([hit[0] + BAR * 2, hit[1], chords[2]]);
      data.push([hit[0] + BAR * 3, hit[1], chords[rando]]);
    }
  } else if (chords.length > 4) {
    // Pick random bars to split into halves
    const halves = [1, 2, 3];
    for (let i = halves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [halves[i], halves[j]] = [halves[j], halves[i]];
    }
    halves.length = chords.length - 4;

    if (hits.length === 1 && hits[0][1] === BAR) {
      // "Whole Notes" special case
      let c = 0;
      for (let i = 0; i < 4; i++) {
        if (halves.includes(i)) {
          data.push([i * BAR, BAR / 2, chords[c++]]);
          data.push([i * BAR + BAR / 2, BAR / 2, chords[c++]]);
        } else {
          data.push([i * BAR, BAR, chords[c++]]);
        }
      }
    } else {
      for (let h = 0; h < hits.length; h++) {
        let c = 0;
        if (h < hits.length / 2) {
          for (let i = 0; i < 4; i++) {
            if (halves.includes(i)) {
              data.push([hits[h][0] + i * BAR, hits[h][1], chords[c]]);
              c += 2;
            } else {
              data.push([hits[h][0] + i * BAR, hits[h][1], chords[c++]]);
            }
          }
        } else {
          for (let i = 0; i < 4; i++) {
            if (halves.includes(i)) {
              data.push([hits[h][0] + i * BAR, hits[h][1], chords[c + 1]]);
              c += 2;
            } else {
              data.push([hits[h][0] + i * BAR, hits[h][1], chords[c++]]);
            }
          }
        }
      }
    }
  } else {
    // Exactly 1 or 4 chords — always fill 4 bars
    for (const hit of hits) {
      for (let i = 0; i < 4; i++) {
        data.push([hit[0] + i * BAR, hit[1], chords[i % chords.length]]);
      }
    }
  }

  return data;
}

/**
 * Generates a chord MIDI sequence from the given options.
 * Ports DraggableFile.cpp createMidiFile().
 */
export function generateChordMidi(opts: ChordMidiOptions): MidiSequence {
  const chords = normalizeSequence(opts.chordSeq);
  const hits = swingRhythm(opts.rhythmPattern, opts.swing);
  const data = distributeChords(chords, hits);

  // Resolve strum direction and offset
  let strumStep = opts.strumAmount;
  let delayStrum = 0;
  if (opts.strum === StrumMode.Up) {
    strumStep *= -1;
    delayStrum = opts.strumAmount;
  }

  // Resolve tilt direction and base offset
  let tiltStep = -opts.tiltAmount;
  let volumeChange = 0;
  if (opts.tilt === VelocityTilt.HighsLeading) {
    tiltStep *= -1;
    volumeChange = opts.tiltAmount;
  }

  const events: MidiNoteEvent[] = [];
  const baseVelocity = 100;

  for (const [start, duration, chord] of data) {
    const n = chord.length || 1;

    for (let idx = 0; idx < chord.length; idx++) {
      const note = chord[idx];

      // Determine strum index per note
      let s: number;
      if (opts.strum === StrumMode.Human) {
        s = Math.floor(Math.random() * n);
      } else {
        s = idx;
      }

      // Determine velocity index per note
      let v: number;
      if (opts.tilt === VelocityTilt.Human) {
        v = Math.floor(Math.random() * n);
      } else {
        v = idx;
      }

      const velocity = Math.max(
        1,
        Math.min(
          127,
          baseVelocity - volumeChange + Math.floor(v * (tiltStep / n)),
        ),
      );

      const startTick =
        start + 1 + delayStrum + Math.floor(s * (strumStep / n));

      events.push({
        note,
        velocity,
        startTick,
        durationTicks: duration,
        channel: opts.channel,
      });
    }
  }

  return {
    ticksPerQuarterNote: 480,
    trackName: 'Chord',
    events,
  };
}

/**
 * Generates a melody MIDI sequence from the given options.
 * Ports MelodyDragger.cpp createMidiFile().
 */
export function generateMelodyMidi(opts: MelodyMidiOptions): MidiSequence {
  const chords = normalizeSequence(opts.chordSeq);

  // If rhythm is too sparse for melody, pick a random one
  let rhythmHits = opts.rhythmPattern;
  if (rhythmHits.length <= 1) {
    const keys = Object.keys(MELODY_RHYTHMS);
    const picked = keys[Math.floor(Math.random() * keys.length)];
    rhythmHits = MELODY_RHYTHMS[picked];
  }

  // Duplicate rhythm for 2-bar coverage (second half offset by 2 bars)
  const src: RhythmHit[] = rhythmHits.map((h) => [h[0], h[1]]);
  const secondHalf: RhythmHit[] = src.map((h) => [h[0] + BAR * 2, h[1]]);
  const allHits = swingRhythm([...src, ...secondHalf], opts.swing);

  const perChord = Math.ceil(allHits.length / chords.length);

  // Generate melody notes for each chord
  const melodies: number[] = [];
  for (let i = 0; i < opts.stringSeq.length; i++) {
    const m = getChordMelody(
      opts.stringSeq[i],
      perChord,
      chords[i]?.[0] ?? opts.root,
    );
    melodies.push(...m);
  }
  melodies.length = Math.min(melodies.length, allHits.length);

  const events: MidiNoteEvent[] = [];
  for (let i = 0; i < allHits.length && i < melodies.length; i++) {
    events.push({
      note: melodies[i],
      velocity: 100,
      startTick: allHits[i][0],
      durationTicks: allHits[i][1],
      channel: opts.channel,
    });
  }

  return {
    ticksPerQuarterNote: 480,
    trackName: 'Melody',
    events,
  };
}
