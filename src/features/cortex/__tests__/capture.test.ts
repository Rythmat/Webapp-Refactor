// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearnTourStore } from '@/features/learnTour/learnTourStore';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import { getCortexRecords, resetCortexLedger } from '../ledger';
import { DWELL_MS, trackDwell } from '../useCortexCapture';

const visibility = vi.spyOn(document, 'visibilityState', 'get');

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetCortexLedger();
  setLocalStoreUser('ana');
  visibility.mockReturnValue('visible');
});

afterEach(() => {
  trackDwell(null);
  setLocalStoreUser(undefined);
  resetCortexLedger();
  vi.useRealTimers();
});

describe('saving a song', () => {
  it('makes it bright on saving, and unsaving doesn’t take that back', () => {
    const { toggleSaved, setSaved } = useSavedSongsStore.getState();
    toggleSaved('africa');
    const saved = getCortexRecords()['song:africa'];
    expect(saved[2]).toBeGreaterThan(0);
    toggleSaved('africa');
    expect(useSavedSongsStore.getState().savedIds.africa).toBeUndefined();
    expect(getCortexRecords()['song:africa']).toEqual(saved);
    setSaved('creep', false);
    expect(getCortexRecords()['song:creep']).toBeUndefined();
    setSaved('creep', true);
    expect(getCortexRecords()['song:creep'][2]).toBeGreaterThan(0);
  });
});

describe('how long on something before it counts', () => {
  it('adds nothing until the time is up, then a dim node', () => {
    trackDwell('song:a');
    vi.advanceTimersByTime(DWELL_MS - 1000);
    expect(getCortexRecords()['song:a']).toBeUndefined();
    vi.advanceTimersByTime(1000);
    expect(getCortexRecords()['song:a'][2]).toBe(0);
  });

  it('starts again on something else', () => {
    trackDwell('song:a');
    vi.advanceTimersByTime(DWELL_MS - 1000);
    trackDwell('song:b');
    vi.advanceTimersByTime(DWELL_MS - 1000);
    expect(getCortexRecords()).toEqual({});
  });

  it('doesn’t count time in another tab', () => {
    visibility.mockReturnValue('hidden');
    trackDwell('song:a');
    vi.advanceTimersByTime(DWELL_MS * 2);
    expect(getCortexRecords()).toEqual({});
    visibility.mockReturnValue('visible');
    vi.advanceTimersByTime(DWELL_MS);
    expect(getCortexRecords()['song:a']).toBeDefined();
  });

  it('doesn’t count a Learn tour driving the page', () => {
    useLearnTourStore.setState({ tour: 'navigate' as never });
    trackDwell('song:a');
    vi.advanceTimersByTime(DWELL_MS * 2);
    expect(getCortexRecords()).toEqual({});
    useLearnTourStore.setState({ tour: null });
  });
});
