/**
 * noteSequences.ts — Turning MIDI into the NoteEvent[] a Learn activity plays.
 *
 * Extracted from ActivityFlow so the chord/arpeggio distinction is testable.
 *
 * THE ONE RULE: A CHORD IS A GROUP
 * Every builder here takes `number[] | number[][]`, and the difference is the
 * whole meaning of the exercise:
 *
 *   [60, 64, 67]     three slots  → an arpeggio: 1, then 3, then 5
 *   [[60, 64, 67]]   one slot     → a chord: 1-3-5 struck together
 *
 * So `midiSequenceToHalfNotes([...triadA, ...triadB])` does NOT play two chords
 * twice each — spreading collapses the groups, and each single note gets
 * repeated in place: 1-1, 3-3, 5-5. That was a real bug across seven chord
 * activities. Build chord input with `chordsInOrder` and never spread a triad.
 */

import * as Tone from 'tone';
import { pitchNameToMidi, type NoteEvent } from '../PianoRollPlay';

const NOTE_DURATION_TICKS = 480;

/**
 * Pick triads by index, keeping each one grouped as a single simultaneity.
 *
 * Exists so call sites express "these chords, in this order" instead of
 * spreading, which silently turns chords into arpeggios.
 */
export const chordsInOrder = (
  triads: number[][],
  order: number[],
): number[][] => order.map((i) => triads[i]).filter(Boolean);

export const normalizeMidiSequence = (
  sequence: number[] | number[][],
): number[][] => {
  const grouped = Array.isArray(sequence[0])
    ? (sequence as number[][])
    : (sequence as number[]).map((midi) => [midi]);

  // Group simultaneous notes into one slot and drop duplicate pitches in the same slot.
  return grouped.map((slot) => Array.from(new Set(slot)));
};

export const midiSequenceToEvents = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
    })),
  );
};

export const midiSequenceToWholeNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * 4 * NOTE_DURATION_TICKS,
      durationTicks: 4 * NOTE_DURATION_TICKS,
    })),
  );
};

export const midiSequenceToHalfNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) => {
    const startTick = 4 * idx * NOTE_DURATION_TICKS;
    const nextStartTick = (4 * idx + 2) * NOTE_DURATION_TICKS;
    return group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: startTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: nextStartTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    ]);
  });
};

export const midiSequenceToQuarterNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
    ]),
  );
};

export const midiSequenceToEighthNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${8 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 0.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 4}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 5}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 6}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 7}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
    ]),
  );
};

export const midiSequenceToStoccatoEvents = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS * 0.5,
    })),
  );
};

export const midiSequenceToMixedArticulation = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks:
        (NOTE_DURATION_TICKS * Math.floor(Math.random() * 2 + 1)) / 2,
    })),
  );
};

export const chordArpegiateEvents = (
  sequence: number[],
  prefix: string,
): NoteEvent[] => {
  const events: NoteEvent[] = [];
  sequence.forEach((note, idx) => {
    events.push(
      {
        id: `${prefix}-${idx}-${note}`,
        pitchName: Tone.Frequency(note, 'midi').toNote(),
        startTicks: idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}Joined-${idx}-${note}`,
        pitchName: Tone.Frequency(note, 'midi').toNote(),
        startTicks: (sequence.length + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    );
  });
  return events;
};

/**
 * Where each chord group first sounds in a built sequence.
 *
 * Builder-agnostic: it matches the pitches sounding at each onset back to the
 * groups that produced them, so it works whether the chord was laid out as one
 * whole note or restruck eight times. A repeating builder reports the same
 * group at several onsets; the caller thins those to one symbol per change.
 */
export function chordGroupOnsets(
  events: readonly NoteEvent[],
  groups: readonly number[][],
): { groupIndex: number; startTick: number }[] {
  const byOnset = new Map<number, Set<number>>();
  for (const event of events) {
    const midi = event.midi ?? pitchNameToMidi(event.pitchName);
    if (typeof midi !== 'number') continue;
    const at = byOnset.get(event.startTicks) ?? new Set<number>();
    at.add(midi);
    byOnset.set(event.startTicks, at);
  }

  const keys = groups.map((g) => [...new Set(g)].sort((a, b) => a - b).join());
  const found: { groupIndex: number; startTick: number }[] = [];

  for (const [startTick, midis] of [...byOnset.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const key = [...midis].sort((a, b) => a - b).join();
    const groupIndex = keys.indexOf(key);
    if (groupIndex !== -1) found.push({ groupIndex, startTick });
  }
  return found;
}
