// @vitest-environment jsdom
/**
 * A collaborator's held notes are kept per sender and track, and let go of
 * when that sender leaves (engine-hooks-10). They were kept by track alone
 * and never released for a peer who left with keys down, so the notes rang
 * on in everyone else's session.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioNoteMessage } from '@/daw/collab/studioRealtime';
import { useStore } from '@/daw/store';

const h = vi.hoisted(() => ({
  handler: null as null | ((msg: StudioNoteMessage) => void),
  engine: { noteOn: vi.fn(), noteOff: vi.fn() },
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: {
    subscribe: (handler: (msg: StudioNoteMessage) => void) => {
      h.handler = handler;
      return () => {
        h.handler = null;
      };
    },
  },
}));
vi.mock('@/daw/collab/StudioRtcManager', () => ({
  StudioRtcManager: class {
    start() {}
    stop() {}
    syncPeers() {}
    setPeerGain() {}
    getPeerLevel() {
      return 0;
    }
  },
}));
vi.mock('@/daw/engine/engineClock', () => ({ addFrameTask: () => () => {} }));
vi.mock('../usePlaybackEngine', () => ({
  trackEngineRegistry: {
    get: (id: string) => (id === 't1' ? { trackEngine: h.engine } : undefined),
  },
}));

import { useStudioMonitor } from '../useStudioMonitor';

const peers = (...ids: number[]) =>
  new Map(ids.map((id) => [id, { selectedTrackId: 't1' }]));

const note = (from: number, action: 'on' | 'off', n: number) =>
  h.handler?.({
    type: 'studio:note',
    action,
    note: n,
    velocity: action === 'on' ? 100 : 0,
    trackId: 't1',
    from,
  });

beforeEach(() => {
  h.engine.noteOn.mockClear();
  h.engine.noteOff.mockClear();
  useStore.setState({ remoteUsers: peers(7, 8) } as never);
});

afterEach(cleanup);

describe('useStudioMonitor remote notes', () => {
  it("lets go of a departed peer's held notes, and only theirs", () => {
    renderHook(() => useStudioMonitor(true, null));
    note(7, 'on', 60);
    note(8, 'on', 64);
    expect(h.engine.noteOn).toHaveBeenCalledTimes(2);

    act(() => useStore.setState({ remoteUsers: peers(8) } as never));
    expect(h.engine.noteOff).toHaveBeenCalledTimes(1);
    expect(h.engine.noteOff).toHaveBeenCalledWith(60);
  });

  it('forgets a note its sender has let go of', () => {
    renderHook(() => useStudioMonitor(true, null));
    note(7, 'on', 60);
    note(7, 'off', 60);
    h.engine.noteOff.mockClear();

    act(() => useStore.setState({ remoteUsers: peers(8) } as never));
    expect(h.engine.noteOff).not.toHaveBeenCalled();
  });

  it('lets go of every held remote note when the session ends', () => {
    const { rerender } = renderHook(
      ({ ready }) => useStudioMonitor(ready, null),
      { initialProps: { ready: true } },
    );
    note(7, 'on', 60);
    note(8, 'on', 64);
    rerender({ ready: false });
    expect(h.engine.noteOff).toHaveBeenCalledWith(60);
    expect(h.engine.noteOff).toHaveBeenCalledWith(64);
  });
});
