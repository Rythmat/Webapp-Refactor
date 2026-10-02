// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

type Handlers = {
  onCC?: (cc: number, value: number) => void;
  onPitchBend?: (value: number) => void;
};
const handlers: Handlers = {};

vi.mock('@/daw/midi/MidiDeviceManager', () => ({
  midiDeviceManager: {
    subscribeToInput: (
      _id: string,
      _on: unknown,
      _off: unknown,
      onCC: Handlers['onCC'],
      onPitchBend: Handlers['onPitchBend'],
    ) => {
      handlers.onCC = onCC;
      handlers.onPitchBend = onPitchBend;
      return () => {};
    },
  },
}));
vi.mock('../useMidiDevices', () => ({ useMidiDevices: () => {} }));

import { useMidiInputRouting } from '../useMidiInputRouting';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '../usePlaybackEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { setActiveSynthTrack } from '@/daw/oracle-synth/synthTrackState';

// A hardware controller's wheels must reach the instrument the keyboard is
// playing — the selected track when nothing is monitored.
describe('useMidiInputRouting — wheels and controllers', () => {
  const engine = { cc: vi.fn(), pitchBend: vi.fn() };

  beforeEach(() => {
    engine.cc.mockClear();
    engine.pitchBend.mockClear();
    trackEngineRegistry.set('t1', { trackEngine: engine } as never);
    useStore.setState({
      tracks: [],
      selectedTrackId: 't1',
      inputs: [{ id: 'kbd', name: 'Keyboard', type: 'input' }],
    } as never);
    useSynthStore.setState({ pitchBend: 0, modWheel: 0 });
  });

  afterEach(() => {
    trackEngineRegistry.delete('t1');
    setActiveSynthTrack(null);
  });

  it('sends pitch bend and the mod wheel to the selected track', () => {
    renderHook(() => useMidiInputRouting());
    handlers.onPitchBend?.(0.5);
    handlers.onCC?.(1, 100);

    expect(engine.pitchBend).toHaveBeenCalledWith(0.5);
    expect(engine.cc).toHaveBeenCalledWith(1, 100);
  });

  it('moves the on-screen Oracle wheels when its panel is open on that track', () => {
    setActiveSynthTrack('t1');
    renderHook(() => useMidiInputRouting());
    handlers.onPitchBend?.(-1);
    handlers.onCC?.(1, 127);

    expect(useSynthStore.getState().pitchBend).toBe(-1);
    expect(useSynthStore.getState().modWheel).toBe(1);
  });

  it('keeps sustain (CC64) in the router rather than forwarding it', () => {
    renderHook(() => useMidiInputRouting());
    handlers.onCC?.(64, 127);
    expect(engine.cc).not.toHaveBeenCalled();
  });
});
