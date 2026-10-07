// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStore } from '@/daw/store';
import { useAudioEngine, useStartAudioOnGesture } from '../useAudioEngine';
import { useTransport } from '../useTransport';

// ── Leaving the editor and coming back (shell-27, engine-hooks-23) ─────────
// The audio engine and Tone's transport are app-wide singletons that outlive
// the editor. Coming back must find the engine ready (no silent editor until
// a click), and leaving must not leave the transport running underneath.

const engine = vi.hoisted(() => ({
  initialized: false,
  init: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => engine.initialized,
    init: engine.init,
    resumeIfNeeded: () => Promise.resolve(),
  },
}));

const transport = vi.hoisted(() => ({
  state: 'stopped' as 'started' | 'stopped' | 'paused',
  ticks: 0,
  loop: false,
  loopStart: '0i',
  loopEnd: '0i',
  timeSignature: [4, 4] as number[],
  bpm: { value: 120 },
  start: vi.fn(),
  pause: vi.fn(),
}));

vi.mock('tone', () => ({ getTransport: () => transport }));

const ticks = vi.hoisted(() => ({ dropRepeatedTicks: vi.fn() }));
vi.mock('@/daw/audio/transportTicks', () => ticks);

beforeEach(() => {
  engine.initialized = false;
  engine.init.mockReset();
  transport.state = 'stopped';
  transport.start.mockReset();
  transport.pause.mockReset();
  transport.pause.mockImplementation(() => {
    transport.state = 'paused';
  });
  useStore.setState({ isPlaying: false, isRecording: false });
});

afterEach(cleanup);

describe('useAudioEngine', () => {
  it('starts ready when the engine already runs (a return to the editor)', () => {
    engine.initialized = true;
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.isReady).toBe(true);
  });

  it('starts not ready on a cold load, until initEngine', async () => {
    engine.init.mockImplementation(async () => {
      engine.initialized = true;
    });
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.isReady).toBe(false);
    await act(() => result.current.initEngine());
    expect(result.current.isReady).toBe(true);
  });

  it('lets the next interaction retry a start that failed', async () => {
    engine.init.mockRejectedValueOnce(new Error('no gesture'));
    engine.init.mockImplementationOnce(async () => {
      engine.initialized = true;
    });
    const { result } = renderHook(() => useAudioEngine());
    await act(async () => {
      await expect(result.current.initEngine()).rejects.toThrow('no gesture');
    });
    await act(() => result.current.initEngine());
    expect(engine.init).toHaveBeenCalledTimes(2);
    expect(result.current.isReady).toBe(true);
  });
});

describe('useStartAudioOnGesture', () => {
  /** The editor's wiring (DawApp): the engine, started by any gesture. */
  function mountEditorAudio() {
    return renderHook(() => {
      const audio = useAudioEngine();
      useStartAudioOnGesture(audio.isReady, audio.initEngine);
      return audio;
    });
  }

  it('logs a start that fails and retries it on the next click', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failure = new Error('no gesture');
    engine.init.mockRejectedValueOnce(failure);
    engine.init.mockImplementationOnce(async () => {
      engine.initialized = true;
    });
    const { result } = mountEditorAudio();

    await act(async () => document.body.click());
    expect(engine.init).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[audio]'),
      failure,
    );
    expect(result.current.isReady).toBe(false);

    await act(async () => document.body.click());
    expect(engine.init).toHaveBeenCalledTimes(2);
    expect(result.current.isReady).toBe(true);
    warn.mockRestore();
  });

  it('starts on a key press too, then stops listening', async () => {
    engine.init.mockImplementation(async () => {
      engine.initialized = true;
    });
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const { result } = mountEditorAudio();
    const listeners = added.mock.calls.filter(
      ([type]) => type === 'click' || type === 'keydown',
    );
    expect(listeners).toHaveLength(2);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(result.current.isReady).toBe(true);
    for (const [type, listener] of listeners) {
      expect(removed).toHaveBeenCalledWith(type, listener);
    }
    added.mockRestore();
    removed.mockRestore();
  });
});

describe('useTransport', () => {
  it('pauses a running transport and playback when the editor unmounts', () => {
    const { unmount } = renderHook(() => useTransport());
    act(() => useStore.setState({ isPlaying: true }));
    transport.state = 'started';
    unmount();
    expect(transport.pause).toHaveBeenCalled();
    expect(transport.state).toBe('paused');
    // Coming back must not start it again on its own.
    expect(useStore.getState().isPlaying).toBe(false);
  });

  it('starts the transport with each tick running once', () => {
    ticks.dropRepeatedTicks.mockReset();
    renderHook(() => useTransport());
    act(() => useStore.setState({ isPlaying: true }));
    expect(ticks.dropRepeatedTicks).toHaveBeenCalledWith(transport);
    expect(ticks.dropRepeatedTicks.mock.invocationCallOrder[0]).toBeLessThan(
      transport.start.mock.invocationCallOrder[0],
    );
  });

  it('leaves a stopped transport alone', () => {
    const { unmount } = renderHook(() => useTransport());
    transport.pause.mockClear();
    unmount();
    expect(transport.pause).not.toHaveBeenCalled();
  });
});
