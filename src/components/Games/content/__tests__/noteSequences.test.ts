import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '../../PianoRollPlay';
import {
  chordArpegiateEvents,
  chordsInOrder,
  midiSequenceToEighthNotes,
  midiSequenceToEvents,
  midiSequenceToHalfNotes,
  midiSequenceToQuarterNotes,
  midiSequenceToStoccatoEvents,
  midiSequenceToWholeNotes,
  normalizeMidiSequence,
} from '../noteSequences';

const C = [60, 64, 67]; // 1-3-5
const F = [65, 69, 72];

/** What actually sounds: MIDI grouped by onset, in time order. */
const byOnset = (events: NoteEvent[]): [number, number[]][] => {
  const slots = new Map<number, number[]>();
  for (const e of events) {
    const midi = e.midi ?? Number.NaN;
    const at = slots.get(e.startTicks) ?? [];
    at.push(midi);
    slots.set(e.startTicks, at);
  }
  return [...slots.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tick, midis]) => [tick, midis.sort((a, b) => a - b)]);
};

/** The builders emit pitch names, so recover MIDI from the note name. */
const onsets = (events: NoteEvent[]) =>
  byOnset(
    events.map((e) => ({
      ...e,
      midi: e.midi ?? nameToMidi(e.pitchName),
    })),
  );

const PCS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
function nameToMidi(name: string): number {
  const m = /^([A-G])(#{0,2}|b{0,2})(-?\d+)$/.exec(name);
  if (!m) return Number.NaN;
  const acc = m[2].startsWith('#') ? m[2].length : -m[2].length;
  return (Number(m[3]) + 1) * 12 + PCS[m[1]] + acc;
}

describe('normalizeMidiSequence', () => {
  it('reads a flat array as one note per slot (an arpeggio)', () => {
    expect(normalizeMidiSequence(C)).toEqual([[60], [64], [67]]);
  });

  it('reads a nested array as one chord per slot', () => {
    expect(normalizeMidiSequence([C])).toEqual([[60, 64, 67]]);
  });

  it('drops a pitch repeated inside one slot', () => {
    expect(normalizeMidiSequence([[60, 64, 60]])).toEqual([[60, 64]]);
  });
});

describe('chordsInOrder', () => {
  it('keeps each triad grouped, in the order asked for', () => {
    expect(chordsInOrder([C, F], [1, 0])).toEqual([F, C]);
  });

  it('skips indices with no chord', () => {
    expect(chordsInOrder([C], [0, 5])).toEqual([C]);
  });
});

describe('chord activities sound as chords, not arpeggios', () => {
  // The regression: spreading triads into a flat array made every repeating
  // builder stutter each note in place — 1-1, 3-3, 5-5 — instead of playing
  // the chord twice. chordsInOrder is what keeps the groups intact.
  it('half notes strike the whole chord twice, not each note twice', () => {
    const events = midiSequenceToHalfNotes(chordsInOrder([C, F], [0, 1]), 'x');
    expect(onsets(events)).toEqual([
      [0, C],
      [960, C],
      [1920, F],
      [2880, F],
    ]);
  });

  it('is what the old spread got wrong', () => {
    // Exactly the shape that shipped: [...C, ...F] instead of [C, F].
    const broken = midiSequenceToHalfNotes([...C, ...F], 'x');
    expect(onsets(broken).slice(0, 3)).toEqual([
      [0, [60]],
      [960, [60]], // 1-1 …
      [1920, [64]], // … then 3-3
    ]);
  });

  it('quarter notes strike the chord four times', () => {
    const events = midiSequenceToQuarterNotes(chordsInOrder([C], [0]), 'x');
    expect(onsets(events)).toEqual([
      [0, C],
      [480, C],
      [960, C],
      [1440, C],
    ]);
  });

  it('eighth notes strike the chord eight times inside one bar', () => {
    const slots = onsets(
      midiSequenceToEighthNotes(chordsInOrder([C], [0]), 'x'),
    );
    expect(slots).toHaveLength(8);
    expect(slots.every(([, midis]) => midis.join() === C.join())).toBe(true);
    expect(slots.at(-1)?.[0]).toBe(1680); // last eighth of the bar
  });

  it('whole notes give one chord per bar', () => {
    expect(
      onsets(midiSequenceToWholeNotes(chordsInOrder([C, F], [0, 1]), 'x')),
    ).toEqual([
      [0, C],
      [1920, F],
    ]);
  });

  it('holds and articulations keep the chord together too', () => {
    const grouped = chordsInOrder([C, F], [0, 1]);
    expect(onsets(midiSequenceToEvents(grouped, 'x'))).toEqual([
      [0, C],
      [480, F],
    ]);
    expect(onsets(midiSequenceToStoccatoEvents(grouped, 'x'))).toEqual([
      [0, C],
      [480, F],
    ]);
  });

  it('gives every event a unique id', () => {
    const events = midiSequenceToQuarterNotes(
      chordsInOrder([C, F], [0, 1]),
      'x',
    );
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });
});

describe('chordArpegiateEvents', () => {
  it('plays 1-3-5 one at a time, then the chord', () => {
    expect(onsets(chordArpegiateEvents(C, 'x'))).toEqual([
      [0, [60]],
      [480, [64]],
      [960, [67]],
      [1920, C],
    ]);
  });
});
