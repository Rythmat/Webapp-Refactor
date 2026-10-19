import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The track reconciler applies only what changed (milestone 1.7) ─────────
// usePlaybackEngine used to re-apply volume, pan, every effect, the sends and
// the automation of every track on any track change (engine-hooks-03), and a
// Prism key change recoloured every track and re-applied them all
// (prism-ui-12). The reconciler compares each track with the one it last
// applied and calls only the setters whose field changed.

const calls = vi.hoisted(() => ({
  log: [] as string[],
  engines: [] as Array<{
    id: number;
    disposed: boolean;
    resolver: ((id: string) => unknown) | null;
  }>,
  refreshes: [] as number[],
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
    updateEffects(_state: unknown, opts?: { deferIr?: boolean }) {
      calls.log.push(`${this.id}:effects${opts?.deferIr ? ' deferIr' : ''}`);
    }
    setSend(id: string, level: number) {
      calls.log.push(`${this.id}:send ${id} ${level}`);
    }
    resolver: ((id: string) => unknown) | null = null;
    setKeySourceResolver(fn: (id: string) => unknown) {
      this.resolver = fn;
    }
    refreshDuckerKey() {
      calls.refreshes.push(this.id);
    }
    getAnalyserNode() {
      return { tapOf: this.id };
    }
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
import {
  duckerKeyLoops,
  endTrackPreview,
  previewTrack,
  startTrackReconciler,
  type TrackReconciler,
} from '../trackReconciler';
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
  calls.refreshes.length = 0;
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

// ── Previews (milestone 1.9) ────────────────────────────────────────────────
// A control being dragged plays through previewTrack without writing the
// store; the release's one write then finds the engine already there.

describe('previews', () => {
  it('plays a dragged value without a store write, and the release applies nothing more', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    calls.log.length = 0;
    const tracks = s().tracks;

    previewTrack(id, { volume: 0.4 });
    previewTrack(id, { volume: 0.3 });
    expect(calls.log).toEqual(['0:volume 0.4', '0:volume 0.3']);
    expect(s().tracks).toBe(tracks);

    calls.log.length = 0;
    s().updateTrack(id, { volume: 0.3 });
    expect(calls.log).toEqual([]);
  });

  it("builds a reverb's new impulse response once, on release", () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    calls.log.length = 0;
    const effects = s().tracks[0].effects;
    const longer = {
      ...effects,
      reverb: { ...effects.reverb, decay: effects.reverb.decay + 2 },
    };

    previewTrack(id, { effects: longer });
    expect(calls.log).toEqual(['0:effects deferIr']);

    calls.log.length = 0;
    s().updateTrack(id, { effects: longer });
    expect(calls.log).toEqual(['0:effects']);
  });

  it('puts the sound back when a gesture changes nothing', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    previewTrack(id, { volume: 0.2 });
    calls.log.length = 0;

    endTrackPreview();
    expect(calls.log).toEqual(['0:volume 0.8']);
  });

  it('does not re-assert a track with no lanes on every preview frame while playing', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    start();
    useStore.setState({ isPlaying: true });
    automation.cleared.length = 0;

    previewTrack(id, { volume: 0.5 });
    expect(automation.cleared).toEqual([]);
    expect(calls.log).toContain('0:volume 0.5');
  });
});

describe('the ducker key wiring', () => {
  function duckBy(id: string, keyTrackId: string): void {
    const track = s().tracks.find((t) => t.id === id)!;
    s().updateTrack(id, {
      effects: {
        ...track.effects,
        ducker: { ...track.effects.ducker, enabled: true, keyTrackId },
      },
    });
  }

  it("resolves another track's post-fader tap, never its own", () => {
    const bass = s().addTrack('midi', 'piano-sampler', 'Bass');
    const kick = s().addTrack('midi', 'piano-sampler', 'Kick');
    start();
    const [bassEngine] = calls.engines;
    expect(bassEngine.resolver!(kick)).toEqual({ tapOf: 1 });
    expect(bassEngine.resolver!(bass)).toBeNull();
    expect(bassEngine.resolver!('missing')).toBeNull();
  });

  it('refuses a key whose own ducker chain leads back (a cycle)', () => {
    const a = s().addTrack('midi', 'piano-sampler', 'A');
    const b = s().addTrack('midi', 'piano-sampler', 'B');
    const c = s().addTrack('midi', 'piano-sampler', 'C');
    start();
    duckBy(b, c);
    duckBy(c, a);
    // A keyed by B: B ducks by C, C by A — a loop back to A.
    expect(calls.engines[0].resolver!(b)).toBeNull();
    expect(duckerKeyLoops(a, b)).toBe(true);
    // C keyed by A is fine while A ducks by nothing.
    expect(duckerKeyLoops(c, a)).toBe(false);
    expect(calls.engines[2].resolver!(a)).toEqual({ tapOf: 0 });
  });

  it('every ducker re-resolves its key when engines are made again', () => {
    s().addTrack('midi', 'piano-sampler', 'Bass');
    start();
    expect(calls.refreshes).toEqual([0]);
    calls.refreshes.length = 0;
    s().addTrack('midi', 'piano-sampler', 'Kick');
    expect(calls.refreshes.sort()).toEqual([0, 1]);
    calls.refreshes.length = 0;
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    expect(calls.refreshes).toEqual([]);
  });
});
