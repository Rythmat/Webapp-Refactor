// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

// ── Pitch info re-renders the vocal view only for what the meter shows ─────
// The worklet re-posts a new object ~24 times a second, in silence too, and
// the hook used to hand each one to React. Now it polls only while the
// track has Pitch Correction on, and renders only when the shown pitch
// (0.1 Hz, corrected note) changes.

vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: class {
    info: { detected: number; corrected: number } | null = null;
    getPitchInfo() {
      return this.info;
    }
  },
}));

import { usePitchInfo, pitchDisplayKey } from '../usePitchInfo';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '../usePlaybackEngine';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

type FakeVocal = { info: { detected: number; corrected: number } | null };
let vocal: FakeVocal;

function vocalTrack(pitchOn: boolean) {
  return {
    id: 'v',
    type: 'audio',
    instrument: 'audio-input',
    vocalChain: [{ type: 'pitch-correction', enabled: pitchOn, params: {} }],
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  vocal = new (VocalFxAdapter as unknown as new () => FakeVocal)();
  trackEngineRegistry.set('v', { instrument: vocal } as never);
});

afterEach(() => {
  cleanup();
  trackEngineRegistry.delete('v');
  vi.useRealTimers();
});

describe('usePitchInfo', () => {
  it('does not poll while Pitch Correction is off', () => {
    useStore.setState({ tracks: [vocalTrack(false)] } as never);
    renderHook(() => usePitchInfo('v'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders only when the shown pitch changes', () => {
    useStore.setState({ tracks: [vocalTrack(true)] } as never);
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return usePitchInfo('v');
    });
    const base = renders;

    // Silence, re-posted as new objects: nothing to show.
    for (let i = 0; i < 10; i++) {
      vocal.info = { detected: 0, corrected: 0 };
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }
    expect(renders).toBe(base);

    // A held note: the first reading shows, the jitter under 0.05 Hz doesn't.
    vocal.info = { detected: 220.01, corrected: 220 };
    act(() => {
      vi.advanceTimersByTime(50);
    });
    vocal.info = { detected: 220.03, corrected: 220.2 };
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(renders).toBe(base + 1);
    expect(result.current.detected).toBe(220.01);

    vocal.info = { detected: 221.5, corrected: 220 };
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(renders).toBe(base + 2);
  });

  it('keys the display on 0.1 Hz and the corrected note', () => {
    expect(pitchDisplayKey({ detected: 0, corrected: 440 })).toBe('');
    expect(pitchDisplayKey({ detected: 440.04, corrected: 440 })).toBe(
      pitchDisplayKey({ detected: 439.96, corrected: 441 }),
    );
    expect(pitchDisplayKey({ detected: 440, corrected: 440 })).not.toBe(
      pitchDisplayKey({ detected: 440, corrected: 466.16 }),
    );
  });
});
