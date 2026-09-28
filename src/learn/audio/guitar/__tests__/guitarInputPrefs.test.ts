// @vitest-environment jsdom
/**
 * Guitar input prefs: their own storage key (never the piano's old
 * microphone key), defaults, field-by-field repair, and the React hook.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GUITAR_INPUT_PREFS,
  GUITAR_INPUT_PREFS_KEY,
  loadGuitarInputPrefs,
  saveGuitarInputPrefs,
  useGuitarInputPrefs,
} from '../guitarInputPrefs';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('guitarInputPrefs', () => {
  it('uses its own key and starts from the defaults', () => {
    expect(GUITAR_INPUT_PREFS_KEY).toBe('learn-guitar-input-v1');
    localStorage.setItem('learn-audio-device-id', 'piano-mic');
    expect(loadGuitarInputPrefs()).toEqual({
      source: 'audio',
      deviceId: null,
      channel: 0,
      trimDb: 0,
      gateRms: 0.01,
      inputLatencyMs: 0,
      bleedDetected: false,
      monitorThroughAmp: false,
    });
  });

  it('merges and saves, and keeps one object per saved value', () => {
    const saved = saveGuitarInputPrefs({ deviceId: 'usb-1', channel: 1 });
    expect(saved).toMatchObject({
      deviceId: 'usb-1',
      channel: 1,
      gateRms: 0.01,
    });
    expect(JSON.parse(localStorage.getItem(GUITAR_INPUT_PREFS_KEY)!)).toEqual(
      saved,
    );
    expect(loadGuitarInputPrefs()).toBe(saved);
    expect(loadGuitarInputPrefs()).toBe(loadGuitarInputPrefs());

    const next = saveGuitarInputPrefs({ gateRms: 0.02 });
    expect(next).toMatchObject({ deviceId: 'usb-1', gateRms: 0.02 });
    expect(loadGuitarInputPrefs()).toBe(next);
  });

  it('repairs bad fields one by one', () => {
    localStorage.setItem(
      GUITAR_INPUT_PREFS_KEY,
      JSON.stringify({
        source: 'midi',
        deviceId: 42,
        channel: -1,
        trimDb: 'loud',
        gateRms: 0,
        inputLatencyMs: 35,
        bleedDetected: 'yes',
        monitorThroughAmp: true,
        setupCompletedAt: 1700000000000,
      }),
    );
    expect(loadGuitarInputPrefs()).toEqual({
      ...DEFAULT_GUITAR_INPUT_PREFS,
      source: 'midi',
      inputLatencyMs: 35,
      monitorThroughAmp: true,
      setupCompletedAt: 1700000000000,
    });
  });

  it('falls back to the defaults for an unreadable entry', () => {
    localStorage.setItem(GUITAR_INPUT_PREFS_KEY, '{not json');
    expect(loadGuitarInputPrefs()).toEqual(DEFAULT_GUITAR_INPUT_PREFS);
  });

  it('keeps new prefs in memory when storage refuses them', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    saveGuitarInputPrefs({ bleedDetected: true });
    expect(loadGuitarInputPrefs().bleedDetected).toBe(true);

    // Storage works again: later tests start from what it holds.
    vi.restoreAllMocks();
    saveGuitarInputPrefs(DEFAULT_GUITAR_INPUT_PREFS);
  });
});

describe('useGuitarInputPrefs', () => {
  it('re-renders when prefs are saved anywhere', () => {
    const { result } = renderHook(() => useGuitarInputPrefs());
    expect(result.current[0]).toEqual(DEFAULT_GUITAR_INPUT_PREFS);

    act(() => result.current[1]({ source: 'midi' }));
    expect(result.current[0].source).toBe('midi');

    act(() => {
      saveGuitarInputPrefs({ inputLatencyMs: 20 });
    });
    expect(result.current[0]).toMatchObject({
      source: 'midi',
      inputLatencyMs: 20,
    });
  });

  it('follows another tab', () => {
    const { result } = renderHook(() => useGuitarInputPrefs());
    act(() => {
      localStorage.setItem(
        GUITAR_INPUT_PREFS_KEY,
        JSON.stringify({ channel: 3 }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', { key: GUITAR_INPUT_PREFS_KEY }),
      );
    });
    expect(result.current[0].channel).toBe(3);
  });
});
