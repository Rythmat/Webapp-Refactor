// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStoreBridge } from '../useStoreBridge';
import { useSynthStore } from '@/daw/oracle-synth/store';
import {
  captureSynthState,
  cacheSynthState,
  getActiveSynthTrack,
  getTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';

// The inline synth strip stays mounted under the full-screen pop-out, so two
// bridges end up on the same track at once.
describe('useStoreBridge with two panels on one track', () => {
  beforeEach(() => {
    useSynthStore.getState().loadPreset('INITIALIZE');
    cacheSynthState('t1', captureSynthState());
  });

  it('opening a second panel keeps the sound picked since the last cache', () => {
    const inline = renderHook(() => useStoreBridge(null, 't1'));
    useSynthStore.getState().loadPreset('BASS');

    const popOut = renderHook(() => useStoreBridge(null, 't1'));
    expect(useSynthStore.getState().presetName).toBe('BASS');

    popOut.unmount();
    inline.unmount();
  });

  it('closing the second panel leaves the track live for saving', () => {
    const inline = renderHook(() => useStoreBridge(null, 't1'));
    const popOut = renderHook(() => useStoreBridge(null, 't1'));
    popOut.unmount();

    expect(getActiveSynthTrack()).toBe('t1');
    useSynthStore.getState().loadPreset('PAD');
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');

    inline.unmount();
    expect(getActiveSynthTrack()).toBeNull();
  });
});
