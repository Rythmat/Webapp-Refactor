// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

// ── Guitar/Bass-to-MIDI runs nothing without a binding ─────────────────────
// It used to poll every 300 ms and run a rAF flush for the editor's whole
// life. Now the poll runs only while a MIDI track has an enabled
// audioMidiSource, the keyboard flush only while a pairing is live, and a
// new engine under the same track ids rebuilds the pairing.

const orch = vi.hoisted(() => ({
  built: [] as { stopped: boolean; node: unknown }[],
  callbacks: null as null | {
    onNoteOn: (e: { number: number; velocity: number }) => void;
    onNoteOff: (e: { number: number }) => void;
  },
}));
vi.mock('@/daw/audio/NodeTapCapture', () => ({
  NodeTapCapture: class {
    constructor(public node: unknown) {}
    stop() {}
  },
}));
vi.mock('@/learn/audio/v2/ProbabilisticOrchestrator', () => ({
  ProbabilisticOrchestrator: class {
    entry: { stopped: boolean; node: unknown };
    constructor(capture: { node: unknown }) {
      this.entry = { stopped: false, node: capture.node };
      orch.built.push(this.entry);
    }
    setCallbacks(cb: typeof orch.callbacks) {
      orch.callbacks = cb;
    }
    async start() {}
    stop() {
      this.entry.stopped = true;
    }
  },
}));
vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: class {
    node = {};
    getPitchDetectSourceNode() {
      return this.node;
    }
  },
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: () => {} },
}));

import { useGuitarMidiDetection } from '../useGuitarMidiDetection';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '../usePlaybackEngine';
import { notifyEngineReady } from '@/daw/engine/trackAudio';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';

let now = 0;

function tracks(enabled: boolean) {
  return [
    { id: 'gtr', type: 'audio', instrument: 'audio-input', audioInputId: 'in' },
    {
      id: 'syn',
      type: 'midi',
      instrument: 'oracle-synth',
      audioMidiSource: { enabled, sourceTrackId: 'gtr', mode: 'mono' },
    },
  ];
}

function setSourceEngine() {
  trackEngineRegistry.set('gtr', {
    instrument: new (GuitarFxAdapter as unknown as new () => object)(),
  } as never);
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb((now += 16)), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  orch.built = [];
  orch.callbacks = null;
  useStore.setState({ tracks: tracks(false) } as never);
});

afterEach(() => {
  cleanup();
  trackEngineRegistry.delete('gtr');
  trackEngineRegistry.delete('syn');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useGuitarMidiDetection', () => {
  it('runs no timer and no frame task without a binding', () => {
    setSourceEngine();
    renderHook(() => useGuitarMidiDetection());
    expect(vi.getTimerCount()).toBe(0);
    expect(frameTaskNames()).toEqual([]);
    expect(orch.built).toHaveLength(0);
  });

  it('pairs when a binding is enabled and stops everything when it is off', () => {
    setSourceEngine();
    renderHook(() => useGuitarMidiDetection());
    useStore.setState({ tracks: tracks(true) } as never);
    expect(orch.built).toHaveLength(1);
    expect(frameTaskNames()).toEqual(['guitar-midi-keyboard']);

    useStore.setState({ tracks: tracks(false) } as never);
    expect(orch.built[0].stopped).toBe(true);
    expect(frameTaskNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushes played notes to the keyboard and clears them on teardown', () => {
    setSourceEngine();
    const batch = vi.spyOn(useStore.getState(), 'hwNotesBatch');
    useStore.setState({ tracks: tracks(true) } as never);
    renderHook(() => useGuitarMidiDetection());
    orch.callbacks?.onNoteOn({ number: 64, velocity: 90 });
    vi.advanceTimersByTime(100);
    expect(batch).toHaveBeenLastCalledWith([64], []);

    useStore.setState({ tracks: tracks(false) } as never);
    expect(batch).toHaveBeenLastCalledWith([], [64]);
    batch.mockRestore();
  });

  it('rebuilds on a new engine under the same track ids', () => {
    setSourceEngine();
    useStore.setState({ tracks: tracks(true) } as never);
    renderHook(() => useGuitarMidiDetection());
    expect(orch.built).toHaveLength(1);

    // A project reload: same ids, new adapter, new node.
    setSourceEngine();
    notifyEngineReady();
    expect(orch.built).toHaveLength(2);
    expect(orch.built[0].stopped).toBe(true);
    expect(orch.built[1].node).not.toBe(orch.built[0].node);
  });
});
