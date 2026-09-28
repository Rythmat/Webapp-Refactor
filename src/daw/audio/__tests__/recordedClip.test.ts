import { describe, it, expect } from 'vitest';
import { buildRecordedClip } from '../recordedClip';
import type { MidiNoteEvent } from '@prism/engine';

const TPQ = 480;
const BAR = TPQ * 4;

const note = (startTick: number, n = 60): MidiNoteEvent => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks: TPQ,
  channel: 1,
});

/** Where a clip's event actually sounds: playback adds clip.startTick. */
const sounds = (clip: { startTick: number; events: MidiNoteEvent[] }) =>
  clip.events.map((e) => clip.startTick + e.startTick);

describe('buildRecordedClip', () => {
  it('keeps the rest before a late entry instead of trimming it', () => {
    // Recording rolls from bar 1; first note lands on beat 3.
    const clip = buildRecordedClip([note(TPQ * 2), note(TPQ * 3)], [], 0);

    expect(clip.startTick).toBe(0);
    // The rest survives as empty space at the front of the clip...
    expect(clip.events[0].startTick).toBe(TPQ * 2);
    // ...so the take still sounds on beat 3, not on the downbeat.
    expect(sounds(clip)).toEqual([TPQ * 2, TPQ * 3]);
  });

  it('places a take punched in mid-timeline where it was played', () => {
    // Recording rolls from bar 5; first note a beat later.
    const punchIn = BAR * 4;
    const clip = buildRecordedClip([note(punchIn + TPQ)], [], punchIn);

    expect(clip.startTick).toBe(punchIn);
    expect(clip.events[0].startTick).toBe(TPQ);
    expect(sounds(clip)).toEqual([punchIn + TPQ]);
  });

  it('anchors to the earliest note, whatever order the take releases in', () => {
    // completedNotes is ordered by note-OFF, so notes[0] isn't the earliest:
    // a short note released first can follow a held one that started earlier.
    const clip = buildRecordedClip(
      [note(TPQ * 3, 72), note(TPQ * 2, 48)],
      [],
      0,
    );

    expect(sounds(clip)).toEqual([TPQ * 3, TPQ * 2]);
    expect(clip.events.every((e) => e.startTick >= 0)).toBe(true);
  });

  it('never emits negative ticks when latency pulls a note ahead of punch-in', () => {
    // Playing right on the punch-in beat, compensated a few ticks early.
    const punchIn = BAR;
    const clip = buildRecordedClip(
      [note(punchIn - 3), note(punchIn + TPQ)],
      [{ tick: punchIn - 5, controller: 64, value: 127, channel: 1 }],
      punchIn,
    );

    expect(clip.startTick).toBe(punchIn - 3);
    expect(clip.events.every((e) => e.startTick >= 0)).toBe(true);
    expect(clip.ccEvents?.every((c) => c.tick >= 0)).toBe(true);
    expect(sounds(clip)).toEqual([punchIn - 3, punchIn + TPQ]);
  });

  it('clamps the clip front to the timeline start', () => {
    const clip = buildRecordedClip([note(0)], [], 0);
    expect(clip.startTick).toBe(0);
    expect(clip.events[0].startTick).toBe(0);
  });

  it('leaves ccEvents undefined when the take had none', () => {
    expect(buildRecordedClip([note(0)], [], 0).ccEvents).toBeUndefined();
  });
});
