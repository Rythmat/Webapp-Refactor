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
    setNoteListener() {}
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
    instrument: unknown = null;
    setInstrument(instrument: unknown) {
      this.instrument = instrument;
    }
    getInstrument() {
      return this.instrument;
    }
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

vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {
    constructor(private program = 0) {}
    init() {
      return Promise.resolve();
    }
    getProgram() {
      return this.program;
    }
    setProgram(program: number) {
      this.program = program;
    }
    allNotesOff() {}
    dispose() {}
  },
}));

// Guitar and vocal adapters whose pedal chain is a log: like the real chain,
// the parameter fast path holds while the block types stay in order, and the
// amp keeps its model while it stays in its slot.
const pedals = vi.hoisted(() => {
  class FakePedalAdapter {
    log: unknown[][] = [];
    private types: string[] = [];
    constructor() {
      pedals.adapters.push(this);
    }
    init() {
      return pedals.initGate ?? Promise.resolve();
    }
    updateChainParams(blocks: { type: string }[]) {
      const same =
        blocks.length === this.types.length &&
        blocks.every((b, i) => b.type === this.types[i]);
      if (same) this.log.push(['params', blocks]);
      return same;
    }
    syncChain(blocks: { type: string }[]) {
      this.log.push(['sync', blocks]);
      this.types = blocks.map((b) => b.type);
    }
    setMonitoring() {}
    getMonitorOutputNode() {
      return null;
    }
    allNotesOff() {}
    dispose() {}
  }
  class FakeGuitarAdapter extends FakePedalAdapter {
    model: unknown = null;
    async loadNamModel(model: unknown, gain?: number) {
      this.log.push(['load', model, gain]);
      this.model = model;
    }
    isNamLoaded() {
      return this.model !== null;
    }
    setAmpSimMode(mode: string) {
      this.log.push(['mode', mode]);
    }
  }
  const pedals = {
    adapters: [] as FakePedalAdapter[],
    /** Holds every adapter's init until it resolves, when a test sets it. */
    initGate: null as Promise<void> | null,
    FakePedalAdapter,
    FakeGuitarAdapter,
    fetch: vi.fn(async (url: string) => ({ url })),
  };
  return pedals;
});
vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: pedals.FakeGuitarAdapter,
}));
vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: class extends pedals.FakePedalAdapter {},
}));
vi.mock('@/daw/audio/nam/NamModelStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/audio/nam/NamModelStore')>()),
  fetchBundledModel: pedals.fetch,
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
import { subscribeEngineReady, trackEngineRegistry } from '../trackAudio';

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
  pedals.adapters.length = 0;
  pedals.initGate = null;
  pedals.fetch.mockClear();
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
    s().addTrack('midi', 'soundfont', 'Keys');
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
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    s().addTrack('midi', 'soundfont', 'Pad');
    start();
    calls.log.length = 0;

    s().updateTrack(id, { volume: 0.5 });
    expect(calls.log).toEqual(['0:volume 0.5']);

    calls.log.length = 0;
    s().updateTrack(id, { pan: -0.25 });
    expect(calls.log).toEqual(['0:pan -0.25']);
  });

  it('applies nothing for a colour or name change (prism-ui-12)', () => {
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    start();
    calls.log.length = 0;
    s().updateTrack(id, { color: '#ff0000', name: 'Renamed' });
    expect(calls.log).toEqual([]);
  });

  it('applies nothing when a collab sync rebuilds equal tracks', () => {
    s().addTrack('midi', 'soundfont', 'Keys');
    start();
    calls.log.length = 0;
    useStore.setState({
      tracks: s().tracks.map((t) => JSON.parse(JSON.stringify(t))),
    });
    expect(calls.log).toEqual([]);
  });

  it("changes every track's gate when one is soloed", () => {
    const a = s().addTrack('midi', 'soundfont', 'A');
    s().addTrack('midi', 'soundfont', 'B');
    start();
    calls.log.length = 0;
    s().toggleSolo(a);
    expect(calls.log.sort()).toEqual(['1:audible false']);
    calls.log.length = 0;
    s().toggleSolo(a);
    expect(calls.log).toEqual(['1:audible true']);
  });

  it('re-asserts automation only for the changed track, while playing', () => {
    const a = s().addTrack('midi', 'soundfont', 'A');
    s().addTrack('midi', 'soundfont', 'B');
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
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    start();
    s().updateTrack(id, { volume: 0.3 });
    expect(calls.engines).toHaveLength(1);
    s().updateTrack(id, { instrument: 'none' });
    expect(calls.engines).toHaveLength(2);
    expect(calls.engines[0].disposed).toBe(true);
  });

  it('makes every engine again after a load bump', async () => {
    s().addTrack('midi', 'soundfont', 'Keys');
    start();
    bumpSessionGeneration('test');
    await Promise.resolve();
    expect(calls.engines).toHaveLength(2);
    expect(calls.engines[0].disposed).toBe(true);
  });

  it('retires the engine of a deleted track and stops after stop()', () => {
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    start();
    s().removeTrack(id);
    expect(calls.engines[0].disposed).toBe(true);
    expect(trackEngineRegistry.size).toBe(0);
    reconciler?.stop();
    s().addTrack('midi', 'soundfont', 'Late');
    expect(calls.engines).toHaveLength(1);
  });
});

// ── Previews (milestone 1.9) ────────────────────────────────────────────────
// A control being dragged plays through previewTrack without writing the
// store; the release's one write then finds the engine already there.

describe('previews', () => {
  it('plays a dragged value without a store write, and the release applies nothing more', () => {
    const id = s().addTrack('midi', 'soundfont', 'Keys');
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
    const id = s().addTrack('midi', 'soundfont', 'Keys');
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
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    start();
    previewTrack(id, { volume: 0.2 });
    calls.log.length = 0;

    endTrackPreview();
    expect(calls.log).toEqual(['0:volume 0.8']);
  });

  it('does not re-assert a track with no lanes on every preview frame while playing', () => {
    const id = s().addTrack('midi', 'soundfont', 'Keys');
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
    const bass = s().addTrack('midi', 'soundfont', 'Bass');
    const kick = s().addTrack('midi', 'soundfont', 'Kick');
    start();
    const [bassEngine] = calls.engines;
    expect(bassEngine.resolver!(kick)).toEqual({ tapOf: 1 });
    expect(bassEngine.resolver!(bass)).toBeNull();
    expect(bassEngine.resolver!('missing')).toBeNull();
  });

  it('refuses a key whose own ducker chain leads back (a cycle)', () => {
    const a = s().addTrack('midi', 'soundfont', 'A');
    const b = s().addTrack('midi', 'soundfont', 'B');
    const c = s().addTrack('midi', 'soundfont', 'C');
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
    s().addTrack('midi', 'soundfont', 'Bass');
    start();
    expect(calls.refreshes).toEqual([0]);
    calls.refreshes.length = 0;
    s().addTrack('midi', 'soundfont', 'Kick');
    expect(calls.refreshes.sort()).toEqual([0, 1]);
    calls.refreshes.length = 0;
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    expect(calls.refreshes).toEqual([]);
  });

  it('every ducker re-resolves its key when any ducker changes', () => {
    const a = s().addTrack('midi', 'soundfont', 'A');
    const b = s().addTrack('midi', 'soundfont', 'B');
    start();
    duckBy(a, b);
    duckBy(b, a); // refused: a loop
    calls.refreshes.length = 0;
    // A lets go of B, which breaks the loop: B's refused key is wired now.
    const track = s().tracks.find((t) => t.id === a)!;
    s().updateTrack(a, {
      effects: {
        ...track.effects,
        ducker: { ...track.effects.ducker, enabled: false },
      },
    });
    expect(calls.refreshes.sort()).toEqual([0, 1]);
    expect(calls.engines[1].resolver!(a)).toEqual({ tapOf: 0 });
  });
});

// ── Guitar/Bass/Vocal chains (live playback of a saved tone) ───────────────
// A track's amp and pedals used to reach its adapter only from its view, so
// a project opened from a draft, the cloud or a template played its guitar
// and vocal takes dry until each view was opened. The engine applies the
// stored chain itself now: when the adapter is ready, and whenever the
// stored chain changes, from wherever (applyPedalChain).

const overdrive = (drive = 0.9) => ({
  type: 'overdrive',
  enabled: true,
  params: { drive, tone: 0.6, volume: 0.7 },
});
const amp = (namModelId: string | null) => ({
  type: 'nam-amp',
  enabled: true,
  params: { inputLevel: 0.5, volume: 0.7 },
  namModelId,
});
const pitch = (shift = 0.75) => ({
  type: 'pitch-correction',
  enabled: true,
  params: { correction: 0, shift, mix: 100 },
});

/** Lets the adapters' inits and the model downloads settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The steps an adapter's chain took, without their arguments. */
const steps = (log: unknown[][]) => log.map(([step]) => step);

function guitarTrack(chain?: unknown[]) {
  const id = s().addTrack('audio', 'audio-input', 'Gtr');
  if (chain) s().setGuitarChain(id, chain as never);
  return id;
}

describe('guitar and vocal chains', () => {
  it("plays a guitar track's saved amp from the start, its model loading in the background", async () => {
    guitarTrack([overdrive(), amp('nam-crunch-plexi')]);
    // What the views would find on engine-ready: the chain already applied.
    const atReady: string[][] = [];
    const stop = subscribeEngineReady(() =>
      atReady.push(steps(pedals.adapters[0]?.log ?? []) as string[]),
    );
    start();
    await settle();
    stop();

    const [adapter] = pedals.adapters;
    expect(adapter.log).toEqual([
      [
        'sync',
        [{ ...overdrive(), namModelId: undefined }, amp('nam-crunch-plexi')],
      ],
      ['load', { url: '/daw-assets/nam-models/crunch-plexi.nam' }, 0.7],
      ['mode', 'nam'],
    ]);
    expect(atReady.at(-1)?.[0]).toBe('sync');
  });

  it("plays an Audio track's saved pitch correction", async () => {
    // A voice is an Audio track with pitch correction in its one chain
    // (the Voice track folded into Audio, 2026-10-22).
    const id = s().addTrack('audio', 'audio-input', 'Vox');
    s().setGuitarChain(id, [pitch()]);
    start();
    await settle();
    expect(pedals.adapters[0].log).toEqual([
      ['sync', [{ ...pitch(), namModelId: undefined }]],
    ]);
  });

  it('leaves a track that saved no chain dry, as its bounce is', async () => {
    guitarTrack();
    start();
    await settle();
    expect(pedals.adapters[0].log).toEqual([]);
  });

  it('follows the stored chain: undo, a collaborator, a template', async () => {
    const id = guitarTrack([overdrive(0.9), amp('nam-crunch-plexi')]);
    start();
    await settle();
    const [adapter] = pedals.adapters;
    adapter.log.length = 0;

    // A knob's value put back (undo): the pedals update in place.
    s().setGuitarChain(id, [overdrive(0.2), amp('nam-crunch-plexi')]);
    expect(steps(adapter.log)).toEqual(['params']);

    // A collaborator rebuilds every track object, the chain unchanged.
    adapter.log.length = 0;
    useStore.setState({
      tracks: s().tracks.map((t) => JSON.parse(JSON.stringify(t))),
    });
    s().updateTrack(id, { volume: 0.5 });
    await settle();
    expect(adapter.log).toEqual([]);

    // Another amp model: it loads once, and the amp switches to it.
    s().setGuitarChain(id, [overdrive(0.2), amp('nam-clean-twin')]);
    s().setGuitarChain(id, [overdrive(0.3), amp('nam-clean-twin')]);
    await settle();
    expect(adapter.log.filter(([step]) => step === 'load')).toEqual([
      ['load', { url: '/daw-assets/nam-models/clean-twin.nam' }, 1],
    ]);

    // A pedal taken out: the chain is rebuilt.
    adapter.log.length = 0;
    s().setGuitarChain(id, [amp('nam-clean-twin')]);
    expect(steps(adapter.log)[0]).toBe('sync');
  });

  it('gives an adapter still in its init the chain the track holds when it ends', async () => {
    let finishInit = () => {};
    pedals.initGate = new Promise<void>((resolve) => {
      finishInit = resolve;
    });
    const id = guitarTrack([amp(null)]);
    start();
    s().setGuitarChain(id, [overdrive(), amp(null)]);
    finishInit();
    await settle();

    expect(pedals.adapters[0].log).toEqual([
      ['sync', [{ ...overdrive(), namModelId: undefined }, amp(null)]],
    ]);
  });

  it('applies the chain again to the new adapter a load builds, and loads its model once', async () => {
    guitarTrack([amp('nam-crunch-plexi')]);
    start();
    await settle();
    bumpSessionGeneration('test');
    await settle();

    expect(pedals.adapters).toHaveLength(2);
    expect(steps(pedals.adapters[1].log)).toEqual(['sync', 'load', 'mode']);
    expect(pedals.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps a phaser on the project's tempo", async () => {
    guitarTrack([{ type: 'phaser', enabled: true, params: { rate: 0.5 } }]);
    start();
    await settle();
    const [adapter] = pedals.adapters;
    adapter.log.length = 0;

    useStore.setState({ bpm: 90 });
    expect(adapter.log).toEqual([
      [
        'params',
        [
          {
            type: 'phaser',
            enabled: true,
            params: { rate: 0.5, bpm: 90 },
            namModelId: undefined,
          },
        ],
      ],
    ]);
  });
});
