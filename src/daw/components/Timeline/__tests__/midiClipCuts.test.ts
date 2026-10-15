import { describe, expect, it } from 'vitest';
import type { MidiCCEvent, MidiNoteEvent } from '@prism/engine';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { midiClipLength, splitMidiClip } from '../midiClipCuts';

// ── Cutting a MIDI clip with the scissors ──────────────────────────────────
// Event ticks are clip-relative, so a cut at song tick T falls at clip tick
// T - clip.startTick. The old scissors compared event ticks with the song
// tick: on a clip after bar 1 it did nothing, or left every note in the left
// half and the right half's notes playing late (timeline-04).

const BAR = 1920;

const note = (
  midi: number,
  startTick: number,
  durationTicks: number,
): MidiNoteEvent => ({
  note: midi,
  velocity: 96,
  startTick,
  durationTicks,
  channel: 0,
});

const cc = (controller: number, tick: number, value: number): MidiCCEvent => ({
  tick,
  controller,
  value,
  channel: 0,
});

/** An unsized clip at bar 5, two bars and a half long. */
const keys: MidiClip = {
  id: 'keys',
  name: 'Keys',
  startTick: 4 * BAR,
  events: [
    note(60, 0, 480),
    // Rings from beat 3 of its first bar over the bar line.
    note(64, 960, 1440),
    note(67, BAR, 480),
    note(72, BAR + 480, 480),
    note(76, 2 * BAR, 960),
  ],
};

/** Where each note plays in the song, as `pitch@tick`. */
const songNotes = (...clips: MidiClip[]) =>
  clips
    .flatMap((c) =>
      c.events.map((e) => `${e.note}@${c.startTick + e.startTick}`),
    )
    .sort();

describe('midiClipLength', () => {
  it('is the drawn box: durationTicks, else the last note end from tick 0', () => {
    expect(midiClipLength(keys)).toBe(2 * BAR + 960);
    expect(midiClipLength({ ...keys, durationTicks: 4 * BAR })).toBe(4 * BAR);
    // A rest at the front counts.
    expect(midiClipLength({ events: [note(60, BAR, 480)] })).toBe(BAR + 480);
    expect(midiClipLength({ events: [] })).toBe(0);
  });
});

describe('splitMidiClip', () => {
  it('cuts a clip after bar 1 at the clip tick under the cursor', () => {
    const halves = splitMidiClip(keys, 5 * BAR, 'right');

    expect(halves).not.toBeNull();
    const [left, right] = halves!;
    expect(left).toEqual({
      ...keys,
      // The note still sounding at the cut ends there, like a trimmed edge.
      events: [note(60, 0, 480), note(64, 960, 960)],
    });
    expect(right).toEqual({
      ...keys,
      id: 'right',
      startTick: 5 * BAR,
      // On the right half's own tick 0.
      events: [note(67, 0, 480), note(72, 480, 480), note(76, BAR, 960)],
    });
    // Unsized, so each box follows its notes and meets at the cut.
    expect(midiClipLength(left)).toBe(BAR);
    expect(right.startTick + midiClipLength(right)).toBe(
      keys.startTick + midiClipLength(keys),
    );
  });

  it('keeps every note where it plays in the song', () => {
    const [left, right] = splitMidiClip(keys, 5 * BAR + 240, 'right')!;
    expect(songNotes(left, right)).toEqual(songNotes(keys));
  });

  it('a half with notes follows them; one without keeps the span it was cut to', () => {
    // Four bars long, notes in the first two and a half.
    const sized = { ...keys, durationTicks: 4 * BAR };
    const [left, rest] = splitMidiClip(sized, 7 * BAR, 'right')!;
    expect(left.durationTicks).toBeUndefined();
    expect(left.events).toEqual(keys.events);
    expect(rest).toMatchObject({ startTick: 7 * BAR, durationTicks: BAR });
    expect(rest.events).toEqual([]);

    // A rest at the front, cut off on its own.
    const late = { ...keys, events: [note(60, 960, 480)] };
    const [lead, notes] = splitMidiClip(late, 4 * BAR + 480, 'right')!;
    expect(lead).toMatchObject({ durationTicks: 480, events: [] });
    expect(notes.durationTicks).toBeUndefined();
    expect(notes.events).toEqual([note(60, 480, 480)]);
  });

  it('puts a note ending at the cut left, untrimmed, and one starting there right', () => {
    const steps = { ...keys, events: [note(60, 0, 480), note(62, 480, 480)] };
    const [left, right] = splitMidiClip(steps, 4 * BAR + 480, 'right')!;
    expect(left.events).toEqual([note(60, 0, 480)]);
    expect(right.events).toEqual([note(62, 0, 480)]);
  });

  it('only cuts strictly inside the clip', () => {
    const end = 4 * BAR + midiClipLength(keys);
    expect(splitMidiClip(keys, 4 * BAR, 'right')).toBeNull();
    expect(splitMidiClip(keys, 3 * BAR, 'right')).toBeNull();
    expect(splitMidiClip(keys, end, 'right')).toBeNull();
    expect(splitMidiClip({ ...keys, events: [] }, 5 * BAR, 'r')).toBeNull();
  });

  it('splits controller events and opens the right half with the values in force', () => {
    const pedalled: MidiClip = {
      ...keys,
      ccEvents: [
        cc(64, 0, 127), // sustain down
        cc(1, 100, 40),
        cc(7, 500, 80),
        cc(1, 1800, 90),
        cc(7, BAR, 100), // set right at the cut
        cc(64, BAR + 280, 0), // sustain up, after the cut
      ],
    };

    const [left, right] = splitMidiClip(pedalled, 5 * BAR, 'right')!;

    expect(left.ccEvents).toEqual([
      cc(64, 0, 127),
      cc(1, 100, 40),
      cc(7, 500, 80),
      cc(1, 1800, 90),
    ]);
    expect(right.ccEvents).toEqual([
      // Carried over: the pedal is still down and the mod wheel at 90.
      cc(64, 0, 127),
      cc(1, 0, 90),
      // Its own, moved onto its tick 0 (CC7 isn't carried: it's set here).
      cc(7, 0, 100),
      cc(64, 280, 0),
    ]);
  });

  it('adds no controller events to a clip without any, and leaves the clip as it was', () => {
    const before = structuredClone(keys);
    const [left, right] = splitMidiClip(keys, 5 * BAR, 'right')!;
    expect(left.ccEvents).toBeUndefined();
    expect(right.ccEvents).toBeUndefined();
    expect(keys).toEqual(before);
  });
});
