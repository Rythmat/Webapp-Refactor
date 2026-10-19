import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── seekTo while playing (milestone 1.11) ─────────────────────────────────
// Setting Tone's transport ticks while it runs emits 'start' with the time
// the jump happens; seekTo hands that time to the registered playback
// scheduler so old audio ends and the new position plays from there. Run:
// npx vitest run src/daw/hooks/__tests__/seekTo.test.ts

const h = vi.hoisted(() => {
  type Listener = (time: number) => void;
  const listeners = new Map<string, Set<Listener>>();
  const transport = {
    state: 'stopped' as 'started' | 'stopped' | 'paused',
    jumpTime: 42,
    _ticks: 0,
    on(name: string, fn: Listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
      return transport;
    },
    off(name: string, fn: Listener) {
      listeners.get(name)?.delete(fn);
      return transport;
    },
    get ticks() {
      return transport._ticks;
    },
    set ticks(t: number) {
      transport._ticks = t;
      // Tone restarts the clock at the new position when it's running.
      if (transport.state === 'started') {
        for (const fn of listeners.get('start') ?? []) fn(transport.jumpTime);
      }
    },
  };
  return {
    transport,
    listeners,
    setPosition: vi.fn(),
    setLastSeekPosition: vi.fn(),
    notePlayheadSeek: vi.fn(),
  };
});

vi.mock('tone', () => ({
  getTransport: () => h.transport,
  now: () => 0,
}));

vi.mock('@/daw/store', () => ({
  useStore: {
    getState: () => ({
      setPosition: h.setPosition,
      setLastSeekPosition: h.setLastSeekPosition,
    }),
  },
}));

vi.mock('@/daw/store/transportSlice', () => ({ getPlaybackLoop: vi.fn() }));
vi.mock('@/daw/audio/AudioEngine', () => ({ audioEngine: {} }));
vi.mock('@/daw/audio/transportTicks', () => ({ dropRepeatedTicks: vi.fn() }));
vi.mock('@/daw/engine/playheadClock', () => ({
  endPlayheadRun: vi.fn(),
  notePlayheadSeek: h.notePlayheadSeek,
  startPlayheadRun: vi.fn(),
}));
// The scheduler module's own dependencies, which seekTo never reaches.
vi.mock('@/daw/engine/trackAudio', () => ({
  trackEngineRegistry: new Map(),
  scheduleMasterAutomation: vi.fn(),
}));
vi.mock('@/daw/audio/AudioBufferStore', () => ({ getAudioBuffer: vi.fn() }));
vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: class {},
}));
vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: class {},
}));

import { seekTo } from '../useTransport';
import {
  setActivePlayback,
  type PlaybackScheduler,
} from '@/daw/engine/playbackScheduler';

const playback = { seek: vi.fn() };

beforeEach(() => {
  h.transport.state = 'stopped';
  h.transport.jumpTime = 42;
  h.transport._ticks = 0;
  h.listeners.clear();
  playback.seek.mockClear();
  h.setPosition.mockClear();
  h.setLastSeekPosition.mockClear();
  h.notePlayheadSeek.mockClear();
  setActivePlayback(playback as unknown as PlaybackScheduler);
});

describe('seekTo', () => {
  it('reschedules the playback at the time the running transport jumps', () => {
    h.transport.state = 'started';
    h.transport.jumpTime = 17.25;
    seekTo(1919.6);

    expect(h.transport.ticks).toBe(1920);
    expect(playback.seek).toHaveBeenCalledTimes(1);
    expect(playback.seek).toHaveBeenCalledWith(1920, 17.25);
    expect(h.notePlayheadSeek).toHaveBeenCalledWith(1920);
    expect(h.setPosition).toHaveBeenCalledWith(1920);
    expect(h.setLastSeekPosition).toHaveBeenCalledWith(1920);
  });

  it('leaves no listener on the transport', () => {
    h.transport.state = 'started';
    seekTo(480);
    expect(h.listeners.get('start')?.size ?? 0).toBe(0);
  });

  it('does not reschedule while stopped', () => {
    seekTo(960);
    expect(h.transport.ticks).toBe(960);
    expect(playback.seek).not.toHaveBeenCalled();
    expect(h.setPosition).toHaveBeenCalledWith(960);
  });

  it('does not reschedule while paused', () => {
    h.transport.state = 'paused';
    seekTo(960);
    expect(playback.seek).not.toHaveBeenCalled();
  });

  it('clamps a negative tick to 0', () => {
    h.transport.state = 'started';
    seekTo(-50);
    expect(playback.seek).toHaveBeenCalledWith(0, 42);
  });

  it('reaches no scheduler once it is unregistered', () => {
    const owner = playback as unknown as PlaybackScheduler;
    // Another scheduler can't unregister this one.
    setActivePlayback(null, {} as PlaybackScheduler);
    h.transport.state = 'started';
    seekTo(100);
    expect(playback.seek).toHaveBeenCalledTimes(1);

    setActivePlayback(null, owner);
    seekTo(200);
    expect(playback.seek).toHaveBeenCalledTimes(1);
  });
});
