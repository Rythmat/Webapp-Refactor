// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// ── Instrument views have no fake controls (dock-instruments-17) ───────────
// The drum machine's "Sample" panel drew the same invented envelope for every
// pad.

const engines = vi.hoisted(() => new Map<string, { instrument: unknown }>());
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: engines,
  subscribeEngineReady: () => () => {},
  getEngineReadyVersion: () => 0,
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {},
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import { DrumMachineView } from '../DrumMachineView';

beforeAll(() => {
  // jsdom has no 2D canvas; the drum grid skips drawing without one.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

beforeEach(() => {
  engines.clear();
  useStore.setState({ tracks: [], remoteUsers: new Map() });
});

afterEach(cleanup);

describe('DrumMachineView', () => {
  it('has no Sample panel with a made-up waveform', () => {
    const id = useStore.getState().addTrack('midi', 'drum-machine', 'Drums');
    render(<DrumMachineView trackId={id} />);

    expect(screen.getByRole('button', { name: /Velocity/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Sample/ })).toBeNull();
  });
});
