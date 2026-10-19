import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiClip, AudioClip, Track } from '@/daw/store/tracksSlice';

// ── The playback scheduler (milestone 1.11) ───────────────────────────────
// Play, loop laps, seeks, stops and edits during playback each book their
// starts and ends at the audio-clock time the transport reaches them. The
// MIDI, audio and automation schedulers are spies here; the store is a small
// zustand store with the fields the scheduler reads. Run:
// npx vitest run src/daw/engine/__tests__/playbackScheduler.test.ts

const h = vi.hoisted(() => ({
  now: 5,
  ticksAt: vi.fn((time: number) => time * 960),
  registry: new Map<string, { trackEngine: unknown; instrument: unknown }>(),
  scheduleMasterAutomation: vi.fn(),
  buffer: { duration: 10, numberOfChannels: 2 },
}));

vi.mock('tone', () => ({
  now: () => h.now,
  getTransport: () => ({ getTicksAtTime: h.ticksAt }),
}));

vi.mock('@/daw/store', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const useStore = create(() => ({
    tracks: [] as Track[],
    bpm: 120,
    loopEnabled: true,
    loopStart: 0,
    loopEnd: 7680,
    editorLoop: null,
  }));
  return { useStore };
});

vi.mock('@/daw/store/transportSlice', () => ({
  getPlaybackLoop: (s: {
    editorLoop: null | { enabled: boolean; start: number; end: number };
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
  }) =>
    s.editorLoop ?? {
      enabled: s.loopEnabled,
      start: s.loopStart,
      end: s.loopEnd,
    },
}));

vi.mock('@/daw/audio/AudioBufferStore', () => ({
  getAudioBuffer: () => h.buffer,
}));

vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: class {},
}));
vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: class {},
}));

vi.mock('@/daw/engine/trackAudio', () => ({
  trackEngineRegistry: h.registry,
  scheduleMasterAutomation: h.scheduleMasterAutomation,
}));

import { useStore } from '@/daw/store';
import {
  PlaybackScheduler,
  isLegacyScheduler,
  LEGACY_SCHEDULER_KEY,
  planTransportStart,
  takePlannedTransportStart,
  type PlaybackSchedulers,
} from '../playbackScheduler';

// ── Fakes ─────────────────────────────────────────────────────────────────

/** A MIDI scheduler that remembers each clip's source, as the real one does. */
function fakeMidi() {
  const sources = new Map<string, unknown>();
  return {
    sources,
    scheduleSequence: vi.fn(
      (_seq: unknown, _e: unknown, _o: number, id: string, src: unknown) => {
        sources.set(id, src);
      },
    ),
    replaceClip: vi.fn(
      (
        id: string,
        _seq: unknown,
        _e: unknown,
        _o: number,
        src: unknown,
        _tick: number,
        _time: number,
      ) => {
        sources.set(id, src);
      },
    ),
    removeClip: vi.fn((id: string) => {
      sources.delete(id);
    }),
    setSource: vi.fn((id: string, src: unknown) => {
      if (sources.has(id)) sources.set(id, src);
    }),
    sourceOf: (id: string) => sources.get(id),
    scheduledClipIds: () => [...sources.keys()],
    releaseAll: vi.fn(),
    cancelAll: vi.fn(() => sources.clear()),
  };
}

function fakeSchedulers() {
  return {
    midi: fakeMidi(),
    audio: {
      scheduleClip: vi.fn(),
      cancelClip: vi.fn(),
      cancelAll: vi.fn(),
    },
    automation: {
      scheduleTrack: vi.fn(),
      cancelAll: vi.fn(),
    },
  };
}

function fakeEngine(name: string) {
  return { name, allNotesOff: vi.fn(), panic: vi.fn() };
}

const note = (n: number, startTick: number, durationTicks = 480) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 0,
});

function midiClip(id: string, startTick: number, extra = {}): MidiClip {
  return { id, startTick, events: [note(60, 0)], ...extra };
}

function audioClip(id: string, startTick: number, duration: number): AudioClip {
  return {
    id,
    startTick,
    duration,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  } as AudioClip;
}

function track(
  id: string,
  midiClips: MidiClip[] = [],
  audioClips: AudioClip[] = [],
): Track {
  return {
    id,
    name: id,
    midiClips,
    audioClips,
    automation: [],
  } as unknown as Track;
}

let s: ReturnType<typeof fakeSchedulers>;
let scheduler: PlaybackScheduler;
let engineA: ReturnType<typeof fakeEngine>;
let engineB: ReturnType<typeof fakeEngine>;

function setTracks(tracks: Track[]): void {
  useStore.setState({ tracks } as never);
}

function tracksNow(): Track[] {
  return (useStore.getState() as unknown as { tracks: Track[] }).tracks;
}

/** Replace one track in the store with `fn(track)`. */
function editTrack(id: string, fn: (t: Track) => Track): void {
  setTracks(tracksNow().map((t) => (t.id === id ? fn(t) : t)));
}

beforeEach(() => {
  h.now = 5;
  h.ticksAt.mockClear();
  h.scheduleMasterAutomation.mockClear();
  h.registry.clear();
  engineA = fakeEngine('A');
  engineB = fakeEngine('B');
  h.registry.set('a', { trackEngine: engineA, instrument: {} });
  h.registry.set('b', { trackEngine: engineB, instrument: {} });
  useStore.setState({
    tracks: [],
    bpm: 120,
    loopEnabled: true,
    loopStart: 1920,
    loopEnd: 3840,
    editorLoop: null,
  } as never);
  s = fakeSchedulers();
  scheduler = new PlaybackScheduler(s as unknown as PlaybackSchedulers);
});

afterEach(() => {
  scheduler.cancel();
});

// ── start ─────────────────────────────────────────────────────────────────

describe('start', () => {
  it('schedules every MIDI clip with its clip as source and every audio clip at t0', () => {
    const m1 = midiClip('m1', 0);
    const m2 = midiClip('m2', 960);
    const a1 = audioClip('a1', 0, 960);
    setTracks([track('a', [m1, m2]), track('b', [], [a1])]);

    scheduler.start(480, 7);

    expect(scheduler.isRunning()).toBe(true);
    expect(s.midi.scheduleSequence).toHaveBeenCalledTimes(2);
    const [seq, engine, offset, id, source] =
      s.midi.scheduleSequence.mock.calls[0];
    expect(seq).toMatchObject({ events: m1.events, ticksPerQuarterNote: 480 });
    expect(offset).toBe(0);
    expect(id).toBe('m1');
    expect(source).toBe(m1);
    // The engine is looked up when an event fires.
    expect(typeof engine).toBe('function');
    expect((engine as () => unknown)()).toBe(engineA);
    expect(s.midi.scheduleSequence.mock.calls[1][4]).toBe(m2);

    expect(s.audio.scheduleClip).toHaveBeenCalledTimes(1);
    expect(s.audio.scheduleClip.mock.calls[0][0]).toMatchObject({
      clip: a1,
      clipId: 'a1',
      fromTick: 480,
      at: 7,
      bpm: 120,
      buffer: h.buffer,
      trackEngine: engineB,
    });

    expect(s.automation.scheduleTrack).toHaveBeenCalledTimes(2);
    expect(s.automation.scheduleTrack.mock.calls[0]).toEqual([
      'a',
      engineA,
      [],
      480,
      120,
      7,
    ]);
    expect(h.scheduleMasterAutomation).toHaveBeenCalledWith(
      s.automation,
      480,
      120,
      7,
    );
  });

  it('skips a track that has no engine', () => {
    setTracks([track('ghost', [midiClip('m1', 0)])]);
    scheduler.start(0, 1);
    expect(s.midi.scheduleSequence).not.toHaveBeenCalled();
  });
});

// ── onLoop ────────────────────────────────────────────────────────────────

describe('onLoop', () => {
  it('ends held notes at the seam and restarts only the audio clips inside the loop', () => {
    // Loop is 1920..3840.
    const before = audioClip('before', 0, 1920); // ends at the loop start
    const crossing = audioClip('crossing', 960, 1920); // 960..2880
    const inside = audioClip('inside', 2400, 480);
    const after = audioClip('after', 3840, 960); // starts at the loop end
    setTracks([track('a', [], [before, crossing, inside, after])]);
    scheduler.start(0, 1);
    s.audio.scheduleClip.mockClear();

    scheduler.onLoop(9);

    expect(engineA.allNotesOff).toHaveBeenCalledWith(9);
    expect(engineB.allNotesOff).toHaveBeenCalledWith(9);
    expect(s.midi.releaseAll).toHaveBeenCalledWith(9);

    expect(s.audio.cancelClip.mock.calls).toEqual([
      ['crossing', 9],
      ['inside', 9],
    ]);
    const starts = s.audio.scheduleClip.mock.calls.map(([c]) => c);
    expect(starts.map((c) => c.clipId)).toEqual(['crossing', 'inside']);
    for (const c of starts) {
      expect(c.fromTick).toBe(1920);
      expect(c.at).toBe(9);
    }
    expect(s.automation.scheduleTrack).toHaveBeenLastCalledWith(
      'a',
      engineA,
      [],
      1920,
      120,
      9,
    );
  });

  it('does nothing when not running', () => {
    scheduler.onLoop(9);
    expect(engineA.allNotesOff).not.toHaveBeenCalled();
    expect(s.midi.releaseAll).not.toHaveBeenCalled();
  });
});

// ── seek ──────────────────────────────────────────────────────────────────

describe('seek', () => {
  it('ends what sounds at the jump and reschedules from the new tick there', () => {
    const a1 = audioClip('a1', 0, 9600);
    setTracks([track('a', [midiClip('m1', 0)], [a1])]);
    scheduler.start(0, 1);
    s.audio.scheduleClip.mockClear();
    s.automation.scheduleTrack.mockClear();

    scheduler.seek(4800, 11);

    expect(engineA.allNotesOff).toHaveBeenCalledWith(11);
    expect(engineB.allNotesOff).toHaveBeenCalledWith(11);
    expect(s.midi.releaseAll).toHaveBeenCalledWith(11);
    expect(s.audio.cancelAll).toHaveBeenCalledWith(11);
    expect(s.audio.scheduleClip).toHaveBeenCalledTimes(1);
    expect(s.audio.scheduleClip.mock.calls[0][0]).toMatchObject({
      clipId: 'a1',
      fromTick: 4800,
      at: 11,
    });
    expect(s.automation.scheduleTrack).toHaveBeenCalledWith(
      'a',
      engineA,
      [],
      4800,
      120,
      11,
    );
    expect(h.scheduleMasterAutomation).toHaveBeenLastCalledWith(
      s.automation,
      4800,
      120,
      11,
    );
    // The MIDI parts stay on the transport.
    expect(s.midi.cancelAll).toHaveBeenCalledTimes(1); // start's own cancel
  });

  it('does nothing when not running', () => {
    scheduler.seek(100, 3);
    expect(s.audio.cancelAll).not.toHaveBeenCalled();
    expect(engineA.allNotesOff).not.toHaveBeenCalled();
  });
});

// ── stop ──────────────────────────────────────────────────────────────────

describe('stop', () => {
  it('panics every engine and cancels everything at the time given', () => {
    setTracks([track('a', [midiClip('m1', 0)])]);
    scheduler.start(0, 1);
    s.audio.cancelAll.mockClear();

    scheduler.stop(13);

    expect(engineA.panic).toHaveBeenCalledWith(13);
    expect(engineB.panic).toHaveBeenCalledWith(13);
    expect(s.midi.releaseAll).toHaveBeenCalledWith(13);
    expect(s.audio.cancelAll).toHaveBeenCalledWith(13);
    expect(s.automation.cancelAll).toHaveBeenCalled();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('uses now when no time is given', () => {
    scheduler.start(0, 1);
    h.now = 21;
    scheduler.stop();
    expect(engineA.panic).toHaveBeenCalledWith(21);
    expect(s.audio.cancelAll).toHaveBeenLastCalledWith(21);
  });
});

// ── Edits while running ───────────────────────────────────────────────────

describe('edits during playback', () => {
  beforeEach(() => {
    setTracks([
      track('a', [midiClip('m1', 0), midiClip('m2', 1920)]),
      track('b', [], [audioClip('a1', 0, 1920), audioClip('a2', 1920, 960)]),
    ]);
    scheduler.start(0, 1);
    s.audio.scheduleClip.mockClear();
    h.now = 6;
  });

  it('rebuilds a MIDI clip whose notes changed, from where the transport is now', () => {
    const edited = { ...midiClip('m1', 0), events: [note(64, 0)] };
    editTrack('a', (t) => ({
      ...t,
      midiClips: [edited, t.midiClips[1]],
    }));

    expect(s.midi.replaceClip).toHaveBeenCalledTimes(1);
    const [id, seq, engine, offset, source, tick, time] =
      s.midi.replaceClip.mock.calls[0];
    expect(id).toBe('m1');
    expect((seq as { events: unknown }).events).toBe(edited.events);
    expect((engine as () => unknown)()).toBe(engineA);
    expect(offset).toBe(0);
    expect(source).toBe(edited);
    expect(h.ticksAt).toHaveBeenCalledWith(6);
    expect(tick).toBe(6 * 960);
    expect(time).toBe(6);
    expect(s.midi.setSource).not.toHaveBeenCalled();
  });

  it('only records the new object for a mute or a rename', () => {
    editTrack('a', (t) => ({
      ...t,
      midiClips: [
        { ...t.midiClips[0], muted: true },
        { ...t.midiClips[1], name: 'Verse' },
      ],
    }));

    expect(s.midi.replaceClip).not.toHaveBeenCalled();
    expect(s.midi.setSource).toHaveBeenCalledTimes(2);
    expect(s.midi.sources.get('m1')).toBe(tracksNow()[0].midiClips[0]);
  });

  it('removes a deleted MIDI clip at now', () => {
    editTrack('a', (t) => ({ ...t, midiClips: [t.midiClips[0]] }));
    expect(s.midi.removeClip).toHaveBeenCalledWith('m2', 6);
    expect(s.midi.replaceClip).not.toHaveBeenCalled();
  });

  it('removes the MIDI clips of a deleted track', () => {
    setTracks(tracksNow().filter((t) => t.id !== 'a'));
    expect(s.midi.removeClip.mock.calls).toEqual([
      ['m1', 6],
      ['m2', 6],
    ]);
  });

  it('cancels and restarts a moved audio clip, and leaves the others', () => {
    editTrack('b', (t) => ({
      ...t,
      audioClips: [{ ...t.audioClips[0], startTick: 480 }, t.audioClips[1]],
    }));
    expect(s.audio.cancelClip.mock.calls).toEqual([['a1', 6]]);
    expect(s.audio.scheduleClip).toHaveBeenCalledTimes(1);
    expect(s.audio.scheduleClip.mock.calls[0][0]).toMatchObject({
      clipId: 'a1',
      fromTick: 6 * 960,
      at: 6,
      trackEngine: engineB,
    });
  });

  it('cancels a deleted audio clip', () => {
    editTrack('b', (t) => ({ ...t, audioClips: [t.audioClips[0]] }));
    expect(s.audio.cancelClip.mock.calls).toEqual([['a2', 6]]);
    expect(s.audio.scheduleClip).not.toHaveBeenCalled();
  });

  it('does nothing for an unchanged track', () => {
    // A new tracks array, the same track objects (another track's volume, say).
    setTracks([...tracksNow()]);
    editTrack('b', (t) => ({ ...t, name: 'renamed' }));
    expect(s.midi.replaceClip).not.toHaveBeenCalled();
    expect(s.midi.setSource).not.toHaveBeenCalled();
    expect(s.midi.removeClip).not.toHaveBeenCalled();
    expect(s.audio.cancelClip).not.toHaveBeenCalled();
    expect(s.audio.scheduleClip).not.toHaveBeenCalled();
  });

  it('ignores store changes after cancel()', () => {
    scheduler.cancel();
    s.midi.removeClip.mockClear();
    editTrack('a', (t) => ({
      ...t,
      midiClips: [{ ...t.midiClips[0], events: [] }],
    }));
    editTrack('b', (t) => ({ ...t, audioClips: [] }));
    expect(s.midi.replaceClip).not.toHaveBeenCalled();
    expect(s.midi.removeClip).not.toHaveBeenCalled();
    expect(s.audio.cancelClip).not.toHaveBeenCalled();
  });

  it('plays a MIDI clip moved to another track through that track’s engine', () => {
    // moveClip (tracksSlice) makes `{ ...clip, startTick }` on the new track;
    // dropped straight down, the tick, events and id are unchanged.
    scheduler.cancel();
    setTracks([
      track('a', [midiClip('m1', 0)]),
      track('b', [], [audioClip('a1', 0, 1920), audioClip('a2', 1920, 960)]),
    ]);
    scheduler.start(0, 1);
    s.midi.replaceClip.mockClear();
    s.midi.removeClip.mockClear();
    const clip = tracksNow()[0].midiClips[0];
    setTracks([
      track('a', []),
      { ...tracksNow()[1], midiClips: [{ ...clip }] },
    ]);

    const rebuilt =
      s.midi.replaceClip.mock.calls.find(([id]) => id === 'm1') ??
      s.midi.removeClip.mock.calls.find(([id]) => id === 'm1');
    // The part must be rebuilt (or removed and rescheduled) so its engine
    // is track b's; setSource alone keeps it on track a's engine.
    expect(rebuilt).toBeDefined();
  });
});

// ── The planned start and the legacy flag ─────────────────────────────────

describe('takePlannedTransportStart', () => {
  it('returns the planned time once', () => {
    planTransportStart(12);
    expect(takePlannedTransportStart(10)).toBe(12);
    expect(takePlannedTransportStart(10)).toBeNull();
  });

  it('ignores a planned time that has passed, and forgets it', () => {
    planTransportStart(8);
    expect(takePlannedTransportStart(10)).toBeNull();
    expect(takePlannedTransportStart(5)).toBeNull();
  });

  it('is null when nothing was planned', () => {
    planTransportStart(null);
    expect(takePlannedTransportStart(0)).toBeNull();
  });
});

describe('isLegacyScheduler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is on only when the flag is '1'", () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
    });
    expect(isLegacyScheduler()).toBe(false);
    store.set(LEGACY_SCHEDULER_KEY, '0');
    expect(isLegacyScheduler()).toBe(false);
    store.set(LEGACY_SCHEDULER_KEY, '1');
    expect(isLegacyScheduler()).toBe(true);
  });

  it('is off when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(isLegacyScheduler()).toBe(false);
  });

  it('is off when there is no localStorage', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(isLegacyScheduler()).toBe(false);
  });
});
