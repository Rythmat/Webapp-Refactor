import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiSequence } from '@prism/engine';

// ── File ▸ Export MIDI and muted clips (milestone 2.12) ────────────────────
// The file holds what plays, as the audio export does: a muted clip is left
// out, and a track whose clips are all muted gets no MIDI track. Run:
// npx vitest run src/daw/commands/__tests__/exportProjectMidi.test.ts

const h = vi.hoisted(() => ({
  exported: null as Map<number, MidiSequence> | null,
}));
vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: (sequences: Map<number, MidiSequence>) => {
    h.exported = sequences;
    return new Blob();
  },
  downloadMidiBlob: () => {},
}));

import { useStore } from '@/daw/store';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { exportProjectMidi } from '../projectCommands';

const s = () => useStore.getState();
const note = (n: number) => ({
  note: n,
  velocity: 100,
  startTick: 0,
  durationTicks: 240,
  channel: 0,
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.exported = null;
});

describe('exportProjectMidi', () => {
  it('leaves muted clips out of the file', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    const bass = s().addTrack('midi', 'piano-sampler', 'Bass');
    s().addMidiClip(keys, {
      id: 'heard',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    s().addMidiClip(keys, {
      id: 'muted',
      startTick: 1920,
      events: [note(62)],
      muted: true,
    } as MidiClip);
    s().addMidiClip(bass, {
      id: 'all-muted',
      startTick: 0,
      events: [note(36)],
      muted: true,
    } as MidiClip);

    await exportProjectMidi();

    expect([...h.exported!.keys()]).toEqual([1]);
    expect(h.exported!.get(1)!.events.map((e) => e.note)).toEqual([60]);
  });

  it('writes no file when every clip is muted', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'muted',
      startTick: 0,
      events: [note(60)],
      muted: true,
    } as MidiClip);

    await exportProjectMidi();

    expect(h.exported).toBeNull();
  });
});
