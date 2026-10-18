/**
 * ▶ on a Library row (milestone 2.14, plan §1.6): one preview at a time, on
 * an instrument of its own, its notes booked a little ahead on the audio
 * clock (a 25 ms loop, 100 ms ahead) so a stop is heard at once. A stop
 * releases the sounding notes and clears the row's state; the panel closing
 * lets every kept instrument go; with no audio after 3 s it gives up
 * quietly. (Play or Record starting is the panel's to handle.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';

interface Booked {
  note: number;
  time: number;
  /** The context's clock when it was booked. */
  now: number;
}

const h = vi.hoisted(() => {
  const ctx = {
    currentTime: 0,
    createGain: () => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
  return {
    ctx,
    ready: true,
    adapters: [] as Array<{
      key: string;
      init: ReturnType<typeof vi.fn>;
      noteOn: ReturnType<typeof vi.fn>;
      noteOff: ReturnType<typeof vi.fn>;
      allNotesOff: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
      on: Booked[];
    }>,
    grooveEvents: null as MidiNoteEvent[] | null,
  };
});

function fakeAdapter(key: string) {
  const on: Booked[] = [];
  const adapter = {
    key,
    on,
    init: vi.fn(async () => {}),
    noteOn: vi.fn((note: number, _velocity: number, time: number) => {
      on.push({ note, time, now: h.ctx.currentTime });
    }),
    noteOff: vi.fn(),
    allNotesOff: vi.fn(),
    panic: vi.fn(),
    dispose: vi.fn(),
  };
  h.adapters.push(adapter);
  return adapter;
}

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => h.ready,
    resumeIfNeeded: async () => {},
    getContext: () => h.ctx,
    getOutput: () => ({ output: true }),
  },
}));
vi.mock('@/daw/instruments/instrumentFactory', () => ({
  createInstrument: (type: string, gm?: number, kit?: string) =>
    fakeAdapter(`${type}:${gm ?? ''}:${kit ?? ''}`),
}));
vi.mock('@/daw/instruments/soundString', () => ({
  createSoundInstrument: (sound: string) => fakeAdapter(`sound:${sound}`),
}));
vi.mock('@/daw/instruments/OracleSynthAdapter', () => ({
  OracleSynthAdapter: class {},
}));
vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  applySynthStateToEngine: vi.fn(),
  synthTrackStateFromPreset: vi.fn(),
}));
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: async () => h.grooveEvents,
}));
vi.mock('../presetData', () => ({ presetData: async () => undefined }));

import { GROOVES } from '@/daw/data/groovesLibrary';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { useBrowserStore } from '../browserStore';
import { grooveItem, kitItem, studioPresetItem } from '../items';
import { releasePreviewVoices, startPreview, stopPreview } from '../preview';

const kit = (id: string) => kitItem(DRUM_KIT_CONFIGS.find((k) => k.id === id)!);
const NATURAL = kit('natural');
const EIGHT08 = kit('808');
const state = () => useBrowserStore.getState().preview;

/** Moves the audio clock and the timers on together. */
async function play(ms: number) {
  for (let t = 0; t < ms; t += 25) {
    h.ctx.currentTime += 0.025;
    await vi.advanceTimersByTimeAsync(25);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  releasePreviewVoices();
  h.ctx.currentTime = 0;
  h.ready = true;
  h.adapters = [];
  h.grooveEvents = null;
  useBrowserStore.setState({ preview: null });
});

afterEach(() => {
  releasePreviewVoices();
  vi.useRealTimers();
});

describe('a preview', () => {
  it('plays on an instrument of its own, into the output', async () => {
    await startPreview(NATURAL, null, 120);
    expect(state()).toEqual({ itemId: NATURAL.id, status: 'playing' });
    expect(h.adapters).toHaveLength(1);
    const [adapter] = h.adapters;
    expect(adapter.key).toBe('drum-machine::natural');
    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.on.length).toBeGreaterThan(0);
  });

  it('books its notes on the context clock, never more than 100 ms ahead', async () => {
    await startPreview(NATURAL, null, 120);
    const [adapter] = h.adapters;
    // At the start only what falls in the first 100 ms is booked.
    const first = adapter.on.length;
    expect(first).toBeGreaterThan(0);
    await play(1000);
    expect(adapter.on.length).toBeGreaterThan(first);
    for (const n of adapter.on) {
      expect(n.time).toBeGreaterThanOrEqual(n.now);
      expect(n.time - n.now).toBeLessThanOrEqual(0.1 + 1e-9);
    }
    // Every note is booked once its time comes, in order.
    const times = adapter.on.map((n) => n.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('plays one at a time: another ▶ stops the first', async () => {
    await startPreview(NATURAL, null, 120);
    const [first] = h.adapters;
    await startPreview(EIGHT08, null, 120);
    expect(first.allNotesOff).toHaveBeenCalled();
    expect(state()).toEqual({ itemId: EIGHT08.id, status: 'playing' });
    const booked = first.on.length;
    await play(500);
    expect(first.on).toHaveLength(booked);
  });

  it('drops a preview overtaken while it loads', async () => {
    h.ready = false;
    const slow = startPreview(NATURAL, null, 120);
    expect(state()).toEqual({ itemId: NATURAL.id, status: 'loading' });
    h.ready = true;
    await startPreview(EIGHT08, null, 120);
    await vi.advanceTimersByTimeAsync(100);
    await slow;
    expect(state()?.itemId).toBe(EIGHT08.id);
    expect(h.adapters.map((a) => a.key)).toEqual(['drum-machine::808']);
  });

  it('stops: the notes are released, the loop ends and the row clears', async () => {
    await startPreview(NATURAL, null, 120);
    const [adapter] = h.adapters;
    const booked = adapter.on.length;
    stopPreview();
    expect(adapter.allNotesOff).toHaveBeenCalledTimes(1);
    expect(state()).toBeNull();
    await play(1000);
    expect(adapter.on).toHaveLength(booked);
    // Its instrument is kept for the next ▶.
    expect(adapter.dispose).not.toHaveBeenCalled();
  });

  it('ends on its own after its last note', async () => {
    await startPreview(NATURAL, null, 120);
    await play(4000);
    expect(state()).toBeNull();
  });

  it('keeps the last three instruments and reuses them', async () => {
    await startPreview(NATURAL, null, 120);
    await startPreview(NATURAL, null, 120);
    expect(h.adapters).toHaveLength(1);
    await startPreview(EIGHT08, null, 120);
    await startPreview(kit('house'), null, 120);
    await startPreview(kit('boogaloo_kit'), null, 120);
    expect(h.adapters).toHaveLength(4);
    // The oldest goes.
    expect(h.adapters[0].dispose).toHaveBeenCalledTimes(1);
    expect(h.adapters.slice(1).every((a) => !a.dispose.mock.calls.length)).toBe(
      true,
    );
  });

  it('lets every kept instrument go when the panel closes', async () => {
    await startPreview(NATURAL, null, 120);
    await startPreview(EIGHT08, null, 120);
    releasePreviewVoices();
    expect(state()).toBeNull();
    for (const adapter of h.adapters) {
      expect(adapter.dispose).toHaveBeenCalledTimes(1);
    }
    // The next ▶ makes a new one.
    await startPreview(NATURAL, null, 120);
    expect(h.adapters).toHaveLength(3);
  });

  it('gives up quietly with no audio after 3 s', async () => {
    h.ready = false;
    const waiting = startPreview(NATURAL, null, 120);
    expect(state()?.status).toBe('loading');
    await vi.advanceTimersByTimeAsync(3100);
    await waiting;
    expect(state()).toBeNull();
    expect(h.adapters).toHaveLength(0);
  });

  it('plays a groove’s notes at its tempo', async () => {
    h.grooveEvents = [
      { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
      {
        note: 38,
        velocity: 90,
        startTick: 480,
        durationTicks: 120,
        channel: 9,
      },
    ];
    const groove = grooveItem(GROOVES.find((g) => g.id === 'groove-hiphop-1')!);
    await startPreview(groove, null, 120);
    await play(2000);
    const [adapter] = h.adapters;
    expect(adapter.on.map((n) => n.note)).toEqual([36, 38]);
    // A beat at the groove's 60 BPM is a second.
    expect(adapter.on[1].time - adapter.on[0].time).toBeCloseTo(1, 6);
  });

  it('plays nothing and clears for a groove that doesn’t load', async () => {
    const groove = grooveItem(GROOVES[0]);
    await startPreview(groove, null, 120);
    expect(state()).toBeNull();
  });

  it('plays a sound’s phrase in the song’s key', async () => {
    const bass = studioPresetItem(
      PRESETS.find((p) => p.category === 'Electric Basses')!,
    );
    await startPreview(bass, { rootPc: 2, mode: 'dorian' }, 120);
    await play(3000);
    // A bass line on D: root, root, fifth, octave.
    expect(h.adapters[0].on.map((n) => n.note)).toEqual([38, 38, 45, 50]);
  });
});
