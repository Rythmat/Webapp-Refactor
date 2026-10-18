import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import type { MidiChannelSequence } from '@/daw/midi/MidiFileIO';
// vi.mock is hoisted above this import, so it sees the mocks below.
import { downloadPartMidi } from '../partFiles';

// ── The Parts Library's MIDI export (milestone 2.15) ───────────────────────
// The writer counts channels from 1, so a drum part goes on 10 (General
// MIDI's kit) and every other part on 1. It used to pass 9 and 0. Run:
// npx vitest run src/features/admin/parts/__tests__/partFiles.test.ts

const h = vi.hoisted(() => ({
  written: [] as MidiChannelSequence[][],
  downloads: [] as string[],
}));
vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: (tracks: MidiChannelSequence[]) => {
    h.written.push(tracks);
    return new Blob();
  },
  downloadMidiBlob: (_blob: Blob, filename: string) => {
    h.downloads.push(filename);
  },
}));
vi.mock('@/curriculum/engine/parts/registry', () => ({ listParts: () => [] }));

const part = (id: string, instrument: string) =>
  ({
    id,
    name: id,
    instrument,
    tempo: 100,
    notes: [{ midi: 36, velocity: 100, tick: 0, duration: 240 }],
  }) as unknown as InstrumentPart;

beforeEach(() => {
  h.written = [];
  h.downloads = [];
});

describe('downloadPartMidi', () => {
  it('writes a drum part on channel 10 and others on channel 1', () => {
    downloadPartMidi(part('beat', 'drums'));
    downloadPartMidi(part('line', 'bass'));

    expect(h.written.map(([t]) => t.channel)).toEqual([10, 1]);
    expect(h.written.map(([t]) => t.sequence.events[0].channel)).toEqual([
      10, 1,
    ]);
    expect(h.downloads).toEqual(['beat.mid', 'line.mid']);
  });
});
