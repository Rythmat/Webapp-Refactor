import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── A MIDI take lands where the student heard the beat (milestone 1.11 d) ──
// Each note's tick comes from its event timeStamp on the speakers' clock,
// not from the transport's tick (which runs a lookAhead and the output
// latency ahead).

const tone = vi.hoisted(() => ({
  transport: {
    ticks: 99999, // never read while there is a clock
    bpm: { value: 120 },
    PPQ: 480,
    getTicksAtTime: (time: number) => (time - 10) * 960,
  },
}));
vi.mock('tone', () => ({
  getContext: () => ({
    lookAhead: 0.1,
    rawContext: {
      _nativeContext: {
        currentTime: 20,
        outputLatency: 0.05,
        // Context time 11 s reached the speakers at 1000 ms.
        getOutputTimestamp: () => ({ contextTime: 11, performanceTime: 1000 }),
      },
    },
  }),
  getTransport: () => tone.transport,
}));

import { MidiRecorder } from '../MidiRecorder';

beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(1500);
});

describe('MidiRecorder', () => {
  it('places notes and CCs at the tick heard at their timestamps', () => {
    const recorder = new MidiRecorder();
    recorder.startRecording();
    // 1250 ms → heard 11.25 s → 1200 ticks; 1500 ms → 11.5 s → 1440.
    recorder.captureNoteOn(60, 100, 1250);
    recorder.captureCC(64, 127, 1300);
    recorder.captureNoteOff(60, 1500);
    const { notes, ccEvents } = recorder.stopRecording();
    expect(notes).toEqual([
      expect.objectContaining({
        note: 60,
        startTick: 1200,
        durationTicks: 240,
      }),
    ]);
    expect(ccEvents[0].tick).toBe(1248);
  });

  it("puts a note heard before the transport's start on its first tick", () => {
    const recorder = new MidiRecorder();
    recorder.startRecording({ transportStart: () => 11.5 });
    recorder.captureNoteOn(62, 90, 1250); // heard 11.25 s, before the start
    recorder.captureNoteOff(62, 1750); // 11.75 s
    const [note] = recorder.stopRecording().notes;
    expect(note.startTick).toBe(1440);
    expect(note.durationTicks).toBe(240);
  });

  it('gives a note let go on the tick it started a tick', () => {
    const recorder = new MidiRecorder();
    recorder.startRecording();
    recorder.captureNoteOn(60, 100, 1250);
    recorder.captureNoteOff(60, 1250);
    expect(recorder.stopRecording().notes[0].durationTicks).toBe(1);
  });

  it('ends a note still held at Stop at the tick heard then', () => {
    const recorder = new MidiRecorder();
    recorder.startRecording();
    recorder.captureNoteOn(64, 100, 1250); // 1200
    // Stop now (1500 ms → heard 11.5 s → 1440), not the transport's tick.
    const [note] = recorder.stopRecording().notes;
    expect(note.startTick).toBe(1200);
    expect(note.durationTicks).toBe(240);
  });
});
