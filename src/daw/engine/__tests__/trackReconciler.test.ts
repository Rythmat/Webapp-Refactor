import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The track reconciler applies only what changed (milestone 1.7) ─────────
// usePlaybackEngine used to re-apply volume, pan, every effect, the sends and
// the automation of every track on any track change (engine-hooks-03), and a
// Prism key change recoloured every track and re-applied them all
// (prism-ui-12). The reconciler compares each track with the one it last
// applied and calls only the setters whose field changed.

const calls = vi.hoisted(() => ({
  log: [] as string[],
  engines: [] as Array<{ id: number; disposed: boolean }>,
  returnIds: [] as string[],
}));

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getContext: () => ({}),
    getMasterGain: () => ({}),
    getReturnIds: () => calls.returnIds,
    getReturnBusInput: () => null,
    getMonitorBus: () => null,
  },
}));

vi.mock('@/daw/audio/TrackEngine', () => ({
  TrackEngine: class {
    id = calls.engines.length;
    disposed = false;
    constructor() {
      calls.engines.push(this);
    }
    setVolume(v: number) {
      calls.log.push(`${this.id}:volume ${v}`);
    }
    setAudible(a: boolean) {
      calls.log.push(`${this.id}:audible ${a}`);
    }
    setPan(p: number) {
      calls.log.push(`${this.id}:pan ${p}`);
    }
    updateEffects() {
      calls.log.push(`${this.id}:effects`);
    }
    setSend(id: string, level: number) {
      calls.log.push(`${this.id}:send ${id} ${level}`);
    }
    setKeySourceResolver() {}
    setInstrument() {}
    allNotesOff() {}
    dispose() {
      this.disposed = true;
    }
    getInputNode() {
      return {};
    }
  },
}));

vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  getTrackSynthState: () => undefined,
  applySynthStateToEngine: () => {},
  defaultSynthTrackState: () => ({}),
}));

vi.mock('@/daw/instruments/PianoSampler', () => ({
  PianoSampler: class {
    init() {
      return Promise.resolve();
    }
    allNotesOff() {}
    dispose() {}
  },
}));

import { useStore } from '@/daw/store';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import type { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import { startTrackReconciler, type TrackReconciler } from '../trackReconciler';
import { trackEngineRegistry } from '../trackAudio';

const s = () => useStore.getState();

const automation = {
  cleared: [] as string[],
  scheduled: [] as Array<{ id: string; tick: number }>,
};
const scheduler = {
  clearTrack: (id: string) => automation.cleared.push(id),
  scheduleTrack: (
    id: string,
    _engine: unknown,
    _lanes: unknown,
    tick: number,
  ) => automation.scheduled.push({ id, tick }),
} as unknown as AutomationScheduler;

let reconciler: TrackReconciler | null = null;

beforeEach(() => {
  calls.log.length = 0;
  calls.engines.length = 0;
  automation.cleared.length = 0;
  automation.scheduled.length = 0;
  trackEngineRegistry.clear();
  useStore.setState({ tracks: [], isPlaying: false, bpm: 120 });
});

afterEach(() => {
  reconciler?.stop();
  reconciler = null;
});

function start(): void {
  reconciler = startTrackReconciler(scheduler);
}

describe('the track reconciler', () => {
  it('makes an engine for each track and applies all of it once', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    expect(calls.engines).toHaveLength(1);
    expect(calls.log).toEqual([
      '0:volume 0.8',
      '0:audible true',
      '0:pan 0',
      '0:effects',
    ]);
  });

  it('applies only the field that changed', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addTrack('midi', 'piano-sampler', 'Pad');
    start();
    calls.log.length = 0;

    s().updateTrack(id, { volume: 0.5 });
    expect(calls.log).toEqual(['0:volume 0.5']);

    calls.log.length = 0;
    s().updateTrack(id, { pan: -0.25 });
    expect(calls.log).toEqual(['0:pan -0.25']);
  });

  it('applies nothing for a colour or name change (prism-ui-12)', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    calls.log.length = 0;
    s().updateTrack(id, { color: '#ff0000', name: 'Renamed' });
    expect(calls.log).toEqual([]);
  });

  it('applies nothing when a collab sync rebuilds equal tracks', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    calls.log.length = 0;
    useStore.setState({
      tracks: s().tracks.map((t) => JSON.parse(JSON.stringify(t))),
    });
    expect(calls.log).toEqual([]);
  });

  it("changes every track's gate when one is soloed", () => {
    const a = s().addTrack('midi', 'piano-sampler', 'A');
    s().addTrack('midi', 'piano-sampler', 'B');
    start();
    calls.log.length = 0;
    s().toggleSolo(a);
    expect(calls.log.sort()).toEqual(['1:audible false']);
    calls.log.length = 0;
    s().toggleSolo(a);
    expect(calls.log).toEqual(['1:audible true']);
  });

  it('re-asserts automation only for the changed track, while playing', () => {
    const a = s().addTrack('midi', 'piano-sampler', 'A');
    s().addTrack('midi', 'piano-sampler', 'B');
    start();
    useStore.setState({ isPlaying: true });
    s().updateTrack(a, { volume: 0.4 });
    expect(automation.cleared).toEqual([a]);
    expect(automation.scheduled.map((x) => x.id)).toEqual([a]);

    automation.cleared.length = 0;
    s().updateTrack(a, { name: 'Lead' });
    expect(automation.cleared).toEqual([]);
  });

  it('makes the engine again for a new instrument, not for an edit', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    s().updateTrack(id, { volume: 0.3 });
    expect(calls.engines).toHaveLength(1);
    s().updateTrack(id, { instrument: 'none' });
    expect(calls.engines).toHaveLength(2);
    expect(calls.engines[0].disposed).toBe(true);
  });

  it('makes every engine again after a load bump', async () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    bumpSessionGeneration('test');
    await Promise.resolve();
    expect(calls.engines).toHaveLength(2);
    expect(calls.engines[0].disposed).toBe(true);
  });

  it('retires the engine of a deleted track and stops after stop()', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    s().removeTrack(id);
    expect(calls.engines[0].disposed).toBe(true);
    expect(trackEngineRegistry.size).toBe(0);
    reconciler?.stop();
    s().addTrack('midi', 'piano-sampler', 'Late');
    expect(calls.engines).toHaveLength(1);
  });
});
