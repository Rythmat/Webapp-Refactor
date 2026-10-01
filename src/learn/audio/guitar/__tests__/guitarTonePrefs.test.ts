// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'learn-guitar-tone-v1';

type Prefs = typeof import('../guitarTonePrefs');
let prefs: Prefs;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  prefs = await import('../guitarTonePrefs');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('guitar tone prefs', () => {
  it("default to the Studio's clean Quartz amp", () => {
    expect(prefs.getGuitarTonePrefs()).toEqual({
      tone: 'amp',
      ampModelId: 'nam-clean-twin',
    });
    expect(prefs.GUITAR_AMP_MODELS[0].name).toBe('Quartz');
  });

  it("list only the Studio's guitar amps", () => {
    expect(prefs.GUITAR_AMP_MODELS.length).toBeGreaterThan(0);
    expect(
      prefs.GUITAR_AMP_MODELS.every((m) => m.forInstrument === 'guitar'),
    ).toBe(true);
  });

  it('save a change, merged with what is there', () => {
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-vox-ac15' });
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    expect(prefs.getGuitarTonePrefs()).toEqual({
      tone: 'acoustic',
      ampModelId: 'nam-vox-ac15',
    });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      tone: 'acoustic',
      ampModelId: 'nam-vox-ac15',
    });
  });

  it('fall back to the defaults for anything unknown', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ tone: 'banjo', ampModelId: 'nam-ampeg-svt' }),
    );
    expect(prefs.getGuitarTonePrefs()).toEqual(prefs.DEFAULT_GUITAR_TONE_PREFS);
    localStorage.setItem(KEY, '{not json');
    expect(prefs.getGuitarTonePrefs()).toEqual(prefs.DEFAULT_GUITAR_TONE_PREFS);
  });

  it('return the same object until they change', () => {
    const first = prefs.getGuitarTonePrefs();
    expect(prefs.getGuitarTonePrefs()).toBe(first);
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    expect(prefs.getGuitarTonePrefs()).not.toBe(first);
  });

  it('tell subscribers about a change, but not about no change', () => {
    const listener = vi.fn();
    const unsubscribe = prefs.subscribeGuitarTonePrefs(listener);
    prefs.setGuitarTonePrefs({ tone: 'amp' });
    expect(listener).not.toHaveBeenCalled();
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-high-gain' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('hear a change made in another tab', () => {
    const listener = vi.fn();
    prefs.subscribeGuitarTonePrefs(listener);
    localStorage.setItem(KEY, JSON.stringify({ tone: 'acoustic' }));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(prefs.getGuitarTonePrefs().tone).toBe('acoustic');
  });

  it('keep a change for the session when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    expect(prefs.getGuitarTonePrefs().tone).toBe('acoustic');
  });
});

describe('useGuitarTonePrefs', () => {
  it('re-renders with a change', () => {
    const { result } = renderHook(() => prefs.useGuitarTonePrefs());
    expect(result.current[0].ampModelId).toBe('nam-clean-twin');
    act(() => result.current[1]({ ampModelId: 'nam-roland-jc120' }));
    expect(result.current[0]).toEqual({
      tone: 'amp',
      ampModelId: 'nam-roland-jc120',
    });
  });
});
