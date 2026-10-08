/**
 * The guitar input engine with a fake rig, note tracker, chord frames and
 * onset detector: Studio's mono settings, mode gating, suppression, the note
 * confirm window, onset attribution and input latency, the metronome click
 * filter, the gate, levels, calibration and teardown.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioChordResult } from '@/daw/audio/AudioChordDetector';
import type { ChordStreamFrame } from '@/daw/audio/ChordAnalysisStream';
import {
  BASS_PITCH_PROFILE,
  GUITAR_PITCH_PROFILE,
  orchestratorOptionsFor,
} from '@/daw/audio/instrumentPitchProfiles';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import type { OrchestratorCallbacks } from '@/learn/audio/v2/ProbabilisticOrchestrator';
import {
  GuitarLearnInputEngine,
  type GuitarChordFrames,
  type GuitarEngineDeps,
  type GuitarNoteTracker,
} from '../GuitarLearnInputEngine';
import { DEFAULT_GUITAR_INPUT_PREFS } from '../guitarInputPrefs';
import type {
  GuitarChordEvent,
  GuitarInputPrefs,
  GuitarInputRig,
} from '../types';

const orchestrators = vi.hoisted(() => [] as unknown[][]);
vi.mock('@/learn/audio/v2/ProbabilisticOrchestrator', () => ({
  ProbabilisticOrchestrator: vi.fn(function (
    this: Record<string, unknown>,
    ...args: unknown[]
  ) {
    orchestrators.push(args);
    this.setCallbacks = vi.fn();
    this.start = vi.fn(async () => {});
    this.stop = vi.fn();
    this.setKeyContext = vi.fn();
    this.clearKeyContext = vi.fn();
    this.setExpectedNotes = vi.fn();
  }),
}));

const C: AudioChordResult = { rootPc: 0, quality: 'major', confidence: 0.9 };
const CHROMA = new Float64Array(12).fill(0.25);

// ── Clock: performance.now() and animation frames, 16 ms apart ────────────

let now = 0;
const frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;

/** Run whole 16 ms frames (and due timers) for `ms`. */
function advance(ms: number) {
  const end = now + ms;
  while (now + 16 <= end) {
    now += 16;
    vi.advanceTimersByTime(16);
    const due = [...frames.values()];
    frames.clear();
    due.forEach((cb) => cb(now));
  }
}

beforeEach(() => {
  now = 1000;
  frames.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(nextFrameId, cb);
    return nextFrameId++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  orchestrators.length = 0;
});

// ── Fakes ────────────────────────────────────────────────────────────────

function fakeNode(context: object) {
  return {
    context,
    fftSize: 0,
    smoothingTimeConstant: 0,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
  };
}

function fakeRig() {
  const context = {
    sampleRate: 48000,
    close: vi.fn(),
    createAnalyser: vi.fn(() => fakeNode(context)),
    // NodeTapCapture's own tap off the clean pre-amp node.
    createGain: vi.fn(() => fakeNode(context)),
  };
  let source: ReturnType<typeof fakeNode> | null = fakeNode(context);
  const chordAnalyser = { ...fakeNode(context), fftSize: 16384 };
  const state = { level: 0.05 };
  const rig = {
    context: context as unknown as AudioContext,
    setDevice: vi.fn(async () => {}),
    setChannel: vi.fn(),
    setInputTrim: vi.fn(),
    setMonitoring: vi.fn(),
    getChordAnalyserNode: () => chordAnalyser as unknown as AnalyserNode,
    getPitchDetectSourceNode: () => source as unknown as AudioNode | null,
    getInputLevel: () => state.level,
    getPlaybackInputNode: () => null,
    setAmpModel: vi.fn(async () => {}),
    dispose: vi.fn(),
  };
  return {
    rig,
    context,
    source: source!,
    state,
    unplug: () => {
      source = null;
    },
  };
}

class FakeTracker implements GuitarNoteTracker {
  private callbacks: OrchestratorCallbacks = {};
  setCallbacks(callbacks: OrchestratorCallbacks) {
    this.callbacks = callbacks;
  }
  start = vi.fn(async () => {});
  stop = vi.fn();
  setKeyContext = vi.fn();
  clearKeyContext = vi.fn();
  setExpectedNotes = vi.fn();
  on(midi: number, velocity = 80) {
    this.callbacks.onNoteOn?.({ number: midi, duration: 0, velocity });
  }
  off(midi: number) {
    this.callbacks.onNoteOff?.({ number: midi, duration: 0, velocity: 0 });
  }
}

/** Frames at Studio's 20 Hz, each naming `match`. */
class FakeChords implements GuitarChordFrames {
  match: AudioChordResult | null = null;
  private last = -Infinity;
  constructor(private readonly onFrame: (f: ChordStreamFrame) => void) {}
  step(nowMs: number) {
    if (nowMs - this.last < 50) return;
    this.last = nowMs;
    this.onFrame({
      perfMs: nowMs,
      result: null,
      frameMatch: this.match,
      chroma: this.match ? CHROMA : null,
    });
  }
  setKeyContext = vi.fn();
  clearKeyContext = vi.fn();
}

/** Fires one onset at the next input tick after strum(). */
class FakeOnsets {
  private armed = false;
  fired: number[] = [];
  strum() {
    this.armed = true;
  }
  process() {
    if (!this.armed) return null;
    this.armed = false;
    this.fired.push(now);
    return { timestamp: now, strength: 1, spectralCentroid: 1000 };
  }
}

async function setup(
  prefs: Partial<GuitarInputPrefs> = {},
  deps: Partial<GuitarEngineDeps> = {},
) {
  const input = fakeRig();
  const tracker = new FakeTracker();
  const onsets = new FakeOnsets();
  let chords!: FakeChords;
  const releaseRig = vi.fn();
  const engine = new GuitarLearnInputEngine(
    { ...DEFAULT_GUITAR_INPUT_PREFS, ...prefs },
    {
      acquireRig: vi.fn(async () => input.rig),
      releaseRig,
      createNoteTracker: () => tracker,
      createChordFrames: (_analyser, onFrame) =>
        (chords = new FakeChords(onFrame)),
      createOnsetDetector: () => onsets,
      ...deps,
    },
  );
  const seen = {
    on: [] as MidiNoteEvent[],
    off: [] as MidiNoteEvent[],
    chords: [] as GuitarChordEvent[],
    levels: [] as number[],
    errors: [] as Error[],
  };
  engine.setCallbacks({
    onNoteOn: (e) => seen.on.push(e),
    onNoteOff: (e) => seen.off.push(e),
    onChord: (e) => seen.chords.push(e),
    onLevel: (l) => seen.levels.push(l),
    onError: (e) => seen.errors.push(e),
  });
  await engine.start();
  advance(64); // the gate opens on the first input tick
  return { engine, input, tracker, onsets, chords, seen, releaseRig };
}

/** A plucked note: an onset, then the tracker names it 80 ms later. */
function pluck(t: Awaited<ReturnType<typeof setup>>, midi: number) {
  t.onsets.strum();
  advance(32);
  const onsetAt = t.onsets.fired[t.onsets.fired.length - 1];
  advance(48);
  t.tracker.on(midi);
  return onsetAt;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Studio's mono note settings", () => {
  it('orchestratorOptionsFor reproduces the Studio literals', () => {
    expect(orchestratorOptionsFor(GUITAR_PITCH_PROFILE, 'monophonic')).toEqual({
      minFreq: 75,
      maxFreq: 1320,
      fastFftSize: 2048,
      hiResFftSize: 8192,
      disableMl: true,
      usePolyTracker: false,
      retriggerOnOnset: true,
      hiResSkipFactor: 6,
    });
    expect(orchestratorOptionsFor(GUITAR_PITCH_PROFILE, 'polyphonic')).toEqual({
      minFreq: 75,
      maxFreq: 1320,
      fastFftSize: 2048,
      hiResFftSize: 8192,
      disableMl: false,
      usePolyTracker: true,
      retriggerOnOnset: false,
      hiResSkipFactor: 1,
    });
    expect(orchestratorOptionsFor(BASS_PITCH_PROFILE, 'monophonic')).toEqual({
      minFreq: 28,
      maxFreq: 400,
      fastFftSize: 4096,
      hiResFftSize: 8192,
      disableMl: true,
      usePolyTracker: false,
      retriggerOnOnset: true,
      hiResSkipFactor: 6,
    });
  });

  it('runs the orchestrator on the clean tap with exactly those settings', async () => {
    const input = fakeRig();
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig: vi.fn(),
    });
    await engine.start();
    expect(orchestrators).toHaveLength(1);
    const [capture, mode, options] = orchestrators[0];
    expect(mode).toBe('monophonic');
    expect(options).toEqual(
      orchestratorOptionsFor(GUITAR_PITCH_PROFILE, 'monophonic'),
    );
    // The orchestrator listens to NodeTapCapture's own tap of the clean
    // pre-amp node, so stopping the capture detaches its ML peer too.
    const tap = (capture as { getSourceNode(): unknown }).getSourceNode();
    expect(tap).toBe(input.context.createGain.mock.results[0].value);
    expect(input.source.connect).toHaveBeenCalledWith(tap);
    // NodeTapCapture's onset/fast/hi-res analysers, plus the 4096 tuner.
    const sizes = input.context.createAnalyser.mock.results.map(
      (r) => r.value.fftSize,
    );
    expect(sizes).toEqual([512, 2048, 8192, 4096]);
    engine.stop();
  });
});

describe('start and stop', () => {
  it('opens the chosen device and channel, trim and monitoring as saved', async () => {
    const { input, engine } = await setup({
      deviceId: 'usb-1',
      channel: 3,
      trimDb: 6,
      monitorThroughAmp: true,
    });
    // Enough channels for input 4: the adapter would clamp it to the two
    // the browser grants by default.
    expect(input.rig.setDevice).toHaveBeenCalledWith('usb-1', 4);
    expect(input.rig.setChannel).toHaveBeenCalledWith(3);
    expect(input.rig.setInputTrim).toHaveBeenCalledWith(6);
    expect(input.rig.setMonitoring).toHaveBeenCalledWith(true);
    expect(engine.isListening).toBe(true);
    expect(engine.getTunerAnalyser()?.fftSize).toBe(4096);
    expect(engine.getRig()).toBe(input.rig);
  });

  it('stops its own nodes, hands the rig back, never closes the context', async () => {
    const t = await setup();
    const tuner = t.engine.getTunerAnalyser();
    t.engine.stop();
    expect(t.tracker.stop).toHaveBeenCalled();
    expect(t.input.source.disconnect).toHaveBeenCalledWith(tuner);
    expect(t.releaseRig).toHaveBeenCalledTimes(1);
    expect(t.input.context.close).not.toHaveBeenCalled();
    expect(t.input.rig.dispose).not.toHaveBeenCalled();
    expect(t.engine.isListening).toBe(false);
    expect(t.engine.getTunerAnalyser()).toBeNull();
    expect(t.seen.levels[t.seen.levels.length - 1]).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('shares one start between concurrent callers', async () => {
    const input = fakeRig();
    const acquireRig = vi.fn(async () => input.rig);
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig,
      releaseRig: vi.fn(),
      createNoteTracker: () => new FakeTracker(),
      createChordFrames: (_a, onFrame) => new FakeChords(onFrame),
      createOnsetDetector: () => new FakeOnsets(),
    });
    await Promise.all([engine.start(), engine.start()]);
    expect(acquireRig).toHaveBeenCalledTimes(1);
    expect(engine.isListening).toBe(true);
  });

  it('backs out of a start that stop() overtook', async () => {
    const input = fakeRig();
    let open!: () => void;
    input.rig.setDevice.mockImplementation(
      () => new Promise<void>((resolve) => (open = resolve)),
    );
    const releaseRig = vi.fn();
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig,
      createNoteTracker: () => new FakeTracker(),
      createChordFrames: (_a, onFrame) => new FakeChords(onFrame),
      createOnsetDetector: () => new FakeOnsets(),
    });
    const starting = engine.start();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(open).toBeDefined();
    engine.stop();
    open();
    await starting;
    expect(engine.isListening).toBe(false);
    expect(releaseRig).toHaveBeenCalledTimes(1);
  });

  it('never asks for the device when stop() comes while the rig loads', async () => {
    const input = fakeRig();
    let loaded!: (rig: GuitarInputRig) => void;
    const releaseRig = vi.fn();
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: () => new Promise((resolve) => (loaded = resolve)),
      releaseRig,
      createNoteTracker: () => new FakeTracker(),
      createChordFrames: (_a, onFrame) => new FakeChords(onFrame),
      createOnsetDetector: () => new FakeOnsets(),
    });
    const starting = engine.start();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    engine.stop();
    loaded(input.rig);
    await starting;
    expect(input.rig.setDevice).not.toHaveBeenCalled();
    expect(releaseRig).toHaveBeenCalledWith(input.rig);
    expect(engine.isListening).toBe(false);
  });

  it('opens one at a time: a restart waits for the open it cancelled', async () => {
    const input = fakeRig();
    const opens: (() => void)[] = [];
    const fail: ((err: Error) => void)[] = [];
    input.rig.setDevice.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          opens.push(resolve);
          fail.push(reject);
        }),
    );
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig: vi.fn(),
      createNoteTracker: () => new FakeTracker(),
      createChordFrames: (_a, onFrame) => new FakeChords(onFrame),
      createOnsetDetector: () => new FakeOnsets(),
    });
    const first = engine.start();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(opens).toHaveLength(1);
    engine.stop();
    const second = engine.start();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(opens).toHaveLength(1); // the first prompt is still up

    // The cancelled open fails: nobody is told, and the new one goes ahead.
    fail[0](new DOMException('Permission dismissed', 'NotAllowedError'));
    await expect(first).resolves.toBeUndefined();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(opens).toHaveLength(2);
    opens[1]();
    await second;
    expect(engine.isListening).toBe(true);
    engine.stop();
  });

  it("passes the browser's permission error through", async () => {
    const input = fakeRig();
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    input.rig.setDevice.mockRejectedValue(denied);
    const releaseRig = vi.fn();
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig,
    });
    await expect(engine.start()).rejects.toBe(denied);
    expect(releaseRig).toHaveBeenCalledTimes(1);
    expect(engine.isListening).toBe(false);
  });

  it("names the rig's plain failure from the microphone permission", async () => {
    const query = vi.fn();
    vi.stubGlobal('navigator', { permissions: { query } });
    const input = fakeRig();
    input.rig.setDevice.mockRejectedValue(new Error('No audio input found'));
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig: vi.fn(),
    });

    query.mockResolvedValue({ state: 'denied' });
    await expect(engine.start()).rejects.toMatchObject({
      name: 'NotAllowedError',
      message: 'No audio input found',
    });
    query.mockResolvedValue({ state: 'granted' });
    await expect(engine.start()).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    query.mockRejectedValue(new TypeError('microphone is not a permission'));
    await expect(engine.start()).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('reports an unplugged input and stops', async () => {
    const t = await setup();
    t.input.unplug();
    advance(64);
    expect(t.seen.errors.map((e) => e.name)).toEqual(['NotFoundError']);
    expect(t.engine.isListening).toBe(false);
    expect(t.releaseRig).toHaveBeenCalledTimes(1);
  });

  it('applies key context and expected notes, before and after start', async () => {
    const input = fakeRig();
    const tracker = new FakeTracker();
    let chords!: FakeChords;
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS, {
      acquireRig: async () => input.rig,
      releaseRig: vi.fn(),
      createNoteTracker: () => tracker,
      createChordFrames: (_a, onFrame) => (chords = new FakeChords(onFrame)),
      createOnsetDetector: () => new FakeOnsets(),
    });
    const ionian = [0, 2, 4, 5, 7, 9, 11];
    engine.setKeyContext(7, ionian);
    engine.setExpectedNotes([55, 57]);
    await engine.start();
    expect(tracker.setKeyContext).toHaveBeenCalledWith(7, ionian);
    expect(chords.setKeyContext).toHaveBeenCalledWith(7, ionian);
    expect(tracker.setExpectedNotes).toHaveBeenCalledWith([55, 57]);

    engine.setExpectedNotes(null);
    engine.clearKeyContext();
    expect(tracker.setExpectedNotes).toHaveBeenLastCalledWith(null);
    expect(tracker.clearKeyContext).toHaveBeenCalled();
    expect(chords.clearKeyContext).toHaveBeenCalled();
  });

  it('reopens on a device change and applies the rest live', async () => {
    const t = await setup({ deviceId: 'a' });
    const next = { ...DEFAULT_GUITAR_INPUT_PREFS, deviceId: 'a', channel: 2 };
    await t.engine.setPrefs({
      ...next,
      monitorThroughAmp: true,
      trimDb: -6,
    });
    expect(t.input.rig.setChannel).toHaveBeenLastCalledWith(2);
    expect(t.input.rig.setMonitoring).toHaveBeenLastCalledWith(true);
    expect(t.input.rig.setInputTrim).toHaveBeenLastCalledWith(-6);
    expect(t.releaseRig).not.toHaveBeenCalled();

    await t.engine.setPrefs({ ...next, deviceId: 'b' });
    expect(t.releaseRig).toHaveBeenCalledTimes(1);
    expect(t.input.rig.setDevice).toHaveBeenLastCalledWith('b', 3);
    expect(t.engine.isListening).toBe(true);
  });
});

describe('notes', () => {
  it('sends nothing unless the step listens for notes', async () => {
    const t = await setup();
    pluck(t, 64);
    advance(200);
    t.engine.setEvaluationMode('chords');
    pluck(t, 64);
    advance(200);
    expect(t.seen.on).toEqual([]);
  });

  it('confirms a note after 60 ms, timed from its onset', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    const onsetAt = pluck(t, 64);
    advance(48);
    expect(t.seen.on).toEqual([]);
    advance(32);
    expect(t.seen.on).toEqual([
      {
        number: 64,
        duration: 0,
        velocity: 80,
        source: 'audio',
        onsetPerfMs: onsetAt,
      },
    ]);

    advance(200);
    t.tracker.off(64);
    expect(t.seen.off).toEqual([
      {
        number: 64,
        duration: (now - onsetAt) / 1000,
        velocity: 80,
        source: 'audio',
        onsetPerfMs: onsetAt,
      },
    ]);
  });

  it('drops a note that ends inside the confirm window', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    pluck(t, 64);
    advance(32);
    t.tracker.off(64);
    advance(200);
    expect(t.seen.on).toEqual([]);
    expect(t.seen.off).toEqual([]);
  });

  it('dates a note without an onset 80 ms before it was named', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    advance(400);
    const namedAt = now;
    t.tracker.on(60);
    advance(100);
    expect(t.seen.on[0].onsetPerfMs).toBe(namedAt - 80);
  });

  it('takes an onset read just after the tracker named the note', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    const first = pluck(t, 64);
    advance(100);
    // The same string re-picked: the tracker re-fires on its own onset tick,
    // before this loop has read the attack, so the latest onset it has is
    // the one the first note already took.
    t.tracker.off(64);
    t.tracker.on(64);
    t.onsets.strum();
    advance(32);
    const second = t.onsets.fired[t.onsets.fired.length - 1];
    advance(100);
    expect(second).toBeGreaterThan(first);
    expect(t.seen.on.map((e) => e.onsetPerfMs)).toEqual([first, second]);
  });

  it('never gives two notes the same onset', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    const onsetAt = pluck(t, 64);
    advance(80);
    t.tracker.off(64); // a pitch change with no attack heard (a slide)
    const namedAt = now;
    t.tracker.on(65);
    advance(100);
    expect(t.seen.on.map((e) => e.onsetPerfMs)).toEqual([
      onsetAt,
      namedAt - 80,
    ]);
  });

  it('removes the measured input latency', async () => {
    const t = await setup({ inputLatencyMs: 30 });
    t.engine.setEvaluationMode('notes');
    const onsetAt = pluck(t, 64);
    advance(100);
    expect(t.seen.on[0].onsetPerfMs).toBe(onsetAt - 30);
    t.tracker.off(64);
    expect(t.seen.off[0]).toMatchObject({
      onsetPerfMs: onsetAt - 30,
      duration: (now - onsetAt) / 1000, // both ends moved alike
    });
  });

  it('ignores the input while suppressed, and ends what was sounding', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    pluck(t, 64);
    advance(100);
    expect(t.seen.on).toHaveLength(1);

    t.engine.setSuppressed(true);
    expect(t.seen.off.map((e) => e.number)).toEqual([64]);
    pluck(t, 67);
    advance(200);
    expect(t.seen.on).toHaveLength(1);

    t.engine.setSuppressed(false);
    pluck(t, 69);
    advance(100);
    expect(t.seen.on.map((e) => e.number)).toEqual([64, 69]);
  });

  it('ends sounding notes when the step stops listening', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    pluck(t, 64);
    advance(100);
    t.engine.setEvaluationMode('off');
    expect(t.seen.off.map((e) => e.number)).toEqual([64]);
    t.tracker.off(64); // the tracker's own release is not sent twice
    expect(t.seen.off).toHaveLength(1);
  });

  it('ignores notes while the input is below the gate', async () => {
    const t = await setup({ gateRms: 0.02 });
    t.engine.setEvaluationMode('notes');
    t.input.state.level = 0.01;
    advance(300);
    pluck(t, 64);
    advance(200);
    expect(t.seen.on).toEqual([]);
  });

  it('holds a note on a metronome click until it outlasts a click', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    t.engine.setClickFilter(() => true); // every attack lands on a click

    pluck(t, 84); // the click: named, then gone within 150 ms
    advance(100);
    t.tracker.off(84);
    advance(200);
    expect(t.seen.on).toEqual([]);

    const onBeat = pluck(t, 72); // a note played on the click
    advance(100); // a note off the click would have been sent by now
    expect(t.seen.on).toEqual([]);
    advance(100);
    expect(t.seen.on).toEqual([
      expect.objectContaining({ number: 72, onsetPerfMs: onBeat }),
    ]);
  });
});

describe('chords', () => {
  it('sends strums only when the step listens for chords', async () => {
    const t = await setup();
    t.chords.match = C;
    t.onsets.strum();
    advance(400);
    t.engine.setEvaluationMode('notes');
    t.onsets.strum();
    advance(400);
    expect(t.seen.chords).toEqual([]);

    t.engine.setEvaluationMode('chords');
    t.onsets.strum();
    advance(32);
    const onsetAt = t.onsets.fired[t.onsets.fired.length - 1];
    advance(400);
    expect(t.seen.chords).toEqual([
      expect.objectContaining({
        phase: 'on',
        rootPc: 0,
        quality: 'major',
        pcs: [0, 4, 7],
        source: 'audio',
        onsetPerfMs: onsetAt,
        chroma: CHROMA,
      }),
    ]);
  });

  it('ends the strum where the input fell below the gate, less latency', async () => {
    const t = await setup({ inputLatencyMs: 20 });
    t.engine.setEvaluationMode('chords');
    t.chords.match = C;
    t.onsets.strum();
    advance(32);
    const onsetAt = t.onsets.fired[0];
    advance(400);
    t.input.state.level = 0;
    advance(16);
    const quietFrom = now;
    advance(300);
    expect(t.seen.chords.map((e) => e.phase)).toEqual(['on', 'off']);
    expect(t.seen.chords[1]).toMatchObject({
      onsetPerfMs: onsetAt - 20,
      offsetPerfMs: expect.any(Number),
    });
    const offset = t.seen.chords[1].offsetPerfMs! + 20;
    expect(offset).toBeGreaterThanOrEqual(quietFrom);
    expect(offset).toBeLessThan(quietFrom + 40);
  });

  it('sends an attack that names no chord as unclear', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('chords');
    t.onsets.strum();
    advance(800);
    expect(t.seen.chords).toEqual([
      expect.objectContaining({ phase: 'on', unclear: true }),
    ]);
  });

  it('drops an unnamed attack on a metronome click', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('chords');
    t.engine.setClickFilter(() => true);
    t.onsets.strum();
    advance(800);
    expect(t.seen.chords).toEqual([]);

    t.chords.match = C; // a real strum on the beat still counts
    t.onsets.strum();
    advance(400);
    expect(t.seen.chords.map((e) => e.phase)).toEqual(['on']);
  });

  it('ignores onsets below the gate', async () => {
    const t = await setup({ gateRms: 0.02 });
    t.engine.setEvaluationMode('chords');
    t.input.state.level = 0.001;
    advance(300);
    t.onsets.strum();
    advance(800);
    expect(t.seen.chords).toEqual([]);

    // Nothing of that attack lingers to surface with the next real strum.
    t.input.state.level = 0.05;
    t.chords.match = C;
    t.onsets.strum();
    advance(400);
    expect(t.seen.chords.map((e) => `${e.phase} #${e.strumId}`)).toEqual([
      'on #1',
    ]);
  });

  it('holds the gate open through a dip under 150 ms', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('chords');
    t.chords.match = C;
    t.onsets.strum();
    advance(400);
    t.input.state.level = 0; // between picks, or a quiet moment of decay
    advance(112);
    t.input.state.level = 0.05;
    advance(200);
    expect(t.seen.chords.map((e) => e.phase)).toEqual(['on']);
  });

  it('ends a sounding strum when suppressed', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('chords');
    t.chords.match = C;
    t.onsets.strum();
    advance(400);
    t.engine.setSuppressed(true);
    expect(t.seen.chords.map((e) => e.phase)).toEqual(['on', 'off']);
    t.onsets.strum();
    advance(400);
    expect(t.seen.chords).toHaveLength(2);
  });

  it('keeps counting strumIds when the input reopens', async () => {
    const opened: FakeChords[] = [];
    const t = await setup(
      { deviceId: 'a' },
      {
        createChordFrames: (_a, onFrame) => {
          const chords = new FakeChords(onFrame);
          chords.match = C;
          opened.push(chords);
          return chords;
        },
      },
    );
    t.engine.setEvaluationMode('chords');
    t.onsets.strum();
    advance(400);
    await t.engine.setPrefs({ ...DEFAULT_GUITAR_INPUT_PREFS, deviceId: 'b' });
    advance(64);
    t.onsets.strum();
    advance(400);
    expect(opened).toHaveLength(2);
    expect(t.seen.chords.map((e) => `${e.phase} #${e.strumId}`)).toEqual([
      'on #1',
      'off #1',
      'on #2',
    ]);
  });

  it('keeps the latest chroma for diagnostics', async () => {
    const t = await setup();
    t.chords.match = C;
    advance(100);
    expect(t.engine.getLastChroma()).toBe(CHROMA);
  });
});

describe('level and gate calibration', () => {
  it('reports the input level about 15 times a second', async () => {
    const t = await setup();
    t.seen.levels.length = 0;
    t.input.state.level = 0.2;
    advance(1000);
    expect(t.seen.levels.length).toBeGreaterThanOrEqual(12);
    expect(t.seen.levels.length).toBeLessThanOrEqual(18);
    expect(new Set(t.seen.levels)).toEqual(new Set([0.2]));
  });

  it('sets the gate to the quiet room × 2.5, within 0.003-0.03', async () => {
    const t = await setup();
    const calibrate = async (level: number) => {
      t.input.state.level = level;
      const gate = t.engine.calibrateGate(2000);
      advance(2000);
      return gate;
    };
    await expect(calibrate(0.004)).resolves.toBeCloseTo(0.01, 6);
    await expect(calibrate(0.0001)).resolves.toBe(0.003);
    await expect(calibrate(0.5)).resolves.toBe(0.03);
  });

  it('uses the calibrated gate', async () => {
    const t = await setup();
    t.engine.setEvaluationMode('notes');
    t.input.state.level = 0.008; // the room's hum: the gate becomes 0.02
    const gate = t.engine.calibrateGate(512);
    advance(512);
    await expect(gate).resolves.toBeCloseTo(0.02, 6);
    t.input.state.level = 0.015; // over the old gate, under the new one
    advance(300);
    pluck(t, 64);
    advance(200);
    expect(t.seen.on).toEqual([]);
  });

  it('refuses to calibrate while not listening', async () => {
    const engine = new GuitarLearnInputEngine(DEFAULT_GUITAR_INPUT_PREFS);
    await expect(engine.calibrateGate()).rejects.toThrow(/not listening/);
  });
});
