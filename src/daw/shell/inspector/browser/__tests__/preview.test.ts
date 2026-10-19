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
  const gains: Array<{
    gain: {
      value: number;
      cancelScheduledValues: ReturnType<typeof vi.fn>;
      setValueAtTime: ReturnType<typeof vi.fn>;
      setTargetAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const ctx = {
    currentTime: 0,
    createGain: () => {
      const node = {
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          setTargetAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(node);
      return node;
    },
  };
  return {
    ctx,
    gains,
    ready: true,
    /** What the next adapter's init waits on (a slow load), if anything. */
    nextInit: null as Promise<void> | null,
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
    /** Replaces the groove's load (e.g. one that fails). */
    grooveLoad: null as null | (() => Promise<MidiNoteEvent[] | null>),
  };
});

function fakeAdapter(key: string) {
  const on: Booked[] = [];
  const gate = h.nextInit;
  h.nextInit = null;
  const adapter = {
    key,
    on,
    init: vi.fn(async () => {
      if (gate) await gate;
    }),
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
  loadGrooveEvents: () =>
    h.grooveLoad ? h.grooveLoad() : Promise.resolve(h.grooveEvents),
}));
vi.mock('../presetData', () => ({ presetData: async () => undefined }));

import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { useBrowserStore } from '../browserStore';
import { grooveItem, kitItem, partItem, studioPresetItem } from '../items';
import { releasePreviewVoices, startPreview, stopPreview } from '../preview';

const kit = (id: string) => kitItem(DRUM_KIT_CONFIGS.find((k) => k.id === id)!);
const NATURAL = kit('natural');
const EIGHT08 = kit('808');
const state = () => useBrowserStore.getState().preview;

/** Hip Hop 1, played at 60 BPM: a beat (480 ticks) is a second. */
const HIPHOP = grooveItem(GROOVES.find((g) => g.id === 'groove-hiphop-1')!);
const hit = (
  note: number,
  startTick: number,
  durationTicks: number,
): MidiNoteEvent => ({
  note,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 9,
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** The next adapter made loads until the returned function is called. */
function slowInit(): () => void {
  const gate = deferred();
  h.nextInit = gate.promise;
  return gate.resolve;
}

/** Lets a preview run on (microtasks only) until it has made `n` adapters. */
async function untilAdapters(n: number) {
  for (let i = 0; i < 50 && h.adapters.length < n; i++) {
    await Promise.resolve();
  }
  expect(h.adapters).toHaveLength(n);
}

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
  h.gains.length = 0;
  h.nextInit = null;
  h.grooveEvents = null;
  h.grooveLoad = null;
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
    // A kit's bar ends at 3 s (its crash), from a start 50 ms ahead.
    await startPreview(NATURAL, null, 120);
    await play(3000);
    expect(state()).toEqual({ itemId: NATURAL.id, status: 'playing' });
    await play(500);
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

  it('plays a sound’s arpeggio and chord on the song’s mode', async () => {
    const brass = studioPresetItem(
      PRESETS.find((p) => p.name === 'Brass Ensemble')!,
    );
    expect(brass.instrument).not.toBe('bass');
    await startPreview(brass, { rootPc: 2, mode: 'dorian' }, 120);
    await play(3000);
    const notes = h.adapters[0].on.map((n) => n.note);
    // D dorian's third is F (65), not F♯: D F A D, then D F A together.
    expect(notes).toEqual([62, 65, 69, 74, 62, 65, 69]);
    expect(notes).not.toContain(66);
  });
});

// Review fixes (2.14): each note's release is booked as it comes within
// reach, as its start is; a stop lets go of every note sounding and fades
// the voice; rows of one sound share one load; a load the panel's closing
// overtook is let go; the voice playing is never the one evicted; a failed
// load clears the row.
describe('a preview’s notes and voices', () => {
  it('books a note’s release only once it comes within 100 ms', async () => {
    h.grooveEvents = [hit(36, 0, 480)];
    await startPreview(HIPHOP, null, 120);
    const [adapter] = h.adapters;
    expect(adapter.noteOn).toHaveBeenCalledTimes(1);
    expect(adapter.noteOff).not.toHaveBeenCalled();
    const t0 = adapter.on[0].time;

    await play(900);
    expect(adapter.noteOff).not.toHaveBeenCalled();
    await play(100);
    expect(adapter.noteOff).toHaveBeenCalledTimes(1);
    const [note, time] = adapter.noteOff.mock.calls[0] as [number, number];
    expect(note).toBe(36);
    // A second at the groove's 60 BPM.
    expect(time).toBeCloseTo(t0 + 1, 6);
  });

  it('starts every note of a chord before any is released', async () => {
    h.grooveEvents = [hit(36, 0, 120), hit(38, 0, 120), hit(42, 0, 120)];
    await startPreview(HIPHOP, null, 120);
    const [adapter] = h.adapters;
    expect(adapter.noteOn).toHaveBeenCalledTimes(3);
    expect(adapter.noteOff).not.toHaveBeenCalled();
    await play(400);
    expect(adapter.noteOff).toHaveBeenCalledTimes(3);
    const lastOn = Math.max(...adapter.noteOn.mock.invocationCallOrder);
    const firstOff = Math.min(...adapter.noteOff.mock.invocationCallOrder);
    expect(lastOn).toBeLessThan(firstOff);
  });

  it('releases every sounding note at a stop, now, and fades the voice', async () => {
    h.grooveEvents = [hit(36, 0, 480), hit(38, 0, 480), hit(42, 960, 120)];
    await startPreview(HIPHOP, null, 120);
    await play(100);
    const [adapter] = h.adapters;
    expect(adapter.noteOn).toHaveBeenCalledTimes(2);
    expect(adapter.noteOff).not.toHaveBeenCalled();

    const now = h.ctx.currentTime;
    stopPreview();
    // The two started (and not yet released) let go now; the one not yet
    // started is left alone.
    expect(adapter.noteOff.mock.calls).toEqual(
      expect.arrayContaining([
        [36, now],
        [38, now],
      ]),
    );
    expect(adapter.noteOff).toHaveBeenCalledTimes(2);
    expect(h.gains).toHaveLength(1);
    expect(h.gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(
      0,
      now,
      expect.any(Number),
    );
  });

  it('makes one instrument for two rows of one sound loading at once', async () => {
    const [p1, p2] = listLiveParts();
    const first = partItem({ ...p1, sound: 'piano-sampler' });
    const second = partItem({ ...p2, sound: 'piano-sampler' });
    const loaded = slowInit();
    const a = startPreview(first, null, 120);
    await untilAdapters(1);
    const b = startPreview(second, null, 120);
    // The second reaches the sound's load while the first is still in it.
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(h.adapters).toHaveLength(1);
    loaded();
    await Promise.all([a, b]);

    expect(h.adapters.map((x) => x.key)).toEqual(['sound:piano-sampler']);
    expect(h.adapters[0].init).toHaveBeenCalledTimes(1);
    expect(state()).toEqual({ itemId: second.id, status: 'playing' });
    await play(2000);
    expect(h.adapters[0].on.length).toBeGreaterThan(0);
  });

  it('lets go of a load that finishes after the panel closed', async () => {
    const loaded = slowInit();
    const slow = startPreview(NATURAL, null, 120);
    await untilAdapters(1);
    releasePreviewVoices();
    loaded();
    await slow;

    expect(h.adapters[0].dispose).toHaveBeenCalledTimes(1);
    expect(h.gains[0].disconnect).toHaveBeenCalled();
    expect(state()).toBeNull();
    // The next ▶ of that sound makes a new instrument.
    await startPreview(NATURAL, null, 120);
    expect(h.adapters).toHaveLength(2);
    expect(h.adapters[1].dispose).not.toHaveBeenCalled();
    expect(state()).toEqual({ itemId: NATURAL.id, status: 'playing' });
  });

  it('never evicts the voice sounding for a fourth sound', async () => {
    // Three loads overtaken while slow, finishing after a fourth sound has
    // started playing: the playing voice is the oldest kept, and stays.
    const r1 = slowInit();
    const p1 = startPreview(NATURAL, null, 120);
    await untilAdapters(1);
    const r2 = slowInit();
    const p2 = startPreview(EIGHT08, null, 120);
    await untilAdapters(2);
    const r3 = slowInit();
    const p3 = startPreview(kit('house'), null, 120);
    await untilAdapters(3);
    const boogaloo = kit('boogaloo_kit');
    await startPreview(boogaloo, null, 120);
    expect(state()).toEqual({ itemId: boogaloo.id, status: 'playing' });
    const playing = h.adapters[3];

    r1();
    r2();
    r3();
    await Promise.all([p1, p2, p3]);
    expect(playing.dispose).not.toHaveBeenCalled();
    // The oldest of the others goes instead.
    expect(h.adapters[0].dispose).toHaveBeenCalledTimes(1);
    expect(h.adapters[1].dispose).not.toHaveBeenCalled();
    expect(h.adapters[2].dispose).not.toHaveBeenCalled();
    // And it plays on.
    const booked = playing.on.length;
    await play(1000);
    expect(playing.on.length).toBeGreaterThan(booked);
    expect(state()).toEqual({ itemId: boogaloo.id, status: 'playing' });
  });

  it('clears the row when a groove’s load fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.grooveLoad = () => Promise.reject(new Error('offline'));
    await expect(startPreview(HIPHOP, null, 120)).resolves.toBeUndefined();
    expect(state()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
