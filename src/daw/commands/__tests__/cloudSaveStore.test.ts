import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INITIAL_CLOUD_SAVE_STATE,
  resetCloudSaveForSession,
  setLastSaved,
  useCloudSaveStore,
  whenSavesSettled,
  type LastSaved,
} from '../cloudSaveStore';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';

// ── The cloud save's state (milestone 1.4, E12) ───────────────────────────
// Run: npx vitest run src/daw/commands/__tests__/cloudSaveStore.test.ts

/** A last save of the session live now. */
const current = (): LastSaved => ({
  projectId: 'p1',
  fingerprint: 'h1:aaaaaaaaaaaaaaaa',
  version: 7,
  complete: true,
  updatedAt: '2026-10-08T00:00:00.000Z',
  at: 1,
  generation: getSessionGeneration(),
});

afterEach(() => {
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useCloudSaveStore', () => {
  it('starts idle with nothing saved', () => {
    expect(useCloudSaveStore.getState()).toEqual(INITIAL_CLOUD_SAVE_STATE);
    expect(useCloudSaveStore.getState().phase).toBe('idle');
  });

  it('sets and clears the last save', () => {
    const record = current();
    expect(setLastSaved(record)).toBe(true);
    expect(useCloudSaveStore.getState().lastSaved).toEqual(record);
    expect(setLastSaved(null)).toBe(true);
    expect(useCloudSaveStore.getState().lastSaved).toBeNull();
  });

  it('refuses a last save from an earlier session generation', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stale = current();
    setLastSaved(stale);
    bumpSessionGeneration('test');
    expect(setLastSaved({ ...stale, projectId: 'p-late' })).toBe(false);
    expect(useCloudSaveStore.getState().lastSaved).toEqual(stale);
    expect(console.warn).toHaveBeenCalled();
    // A record of the new generation applies, and clearing always does.
    const fresh = current();
    expect(setLastSaved(fresh)).toBe(true);
    expect(useCloudSaveStore.getState().lastSaved).toEqual(fresh);
  });

  it('resets per session, keeping inFlight and savedCount', () => {
    useCloudSaveStore.setState({
      phase: 'error',
      source: 'chip',
      error: { kind: 'offline', message: 'You are offline.' },
      lastSaved: current(),
      inFlight: 1,
      savedCount: 3,
    });
    resetCloudSaveForSession();
    const s = useCloudSaveStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.source).toBeNull();
    expect(s.error).toBeNull();
    expect(s.lastSaved).toBeNull();
    expect(s.inFlight).toBe(1);
    expect(s.savedCount).toBe(3);
  });
});

describe('whenSavesSettled', () => {
  it('resolves true at once with nothing in flight', async () => {
    await expect(whenSavesSettled()).resolves.toBe(true);
  });

  it('resolves true when inFlight reaches 0', async () => {
    useCloudSaveStore.setState({ inFlight: 2 });
    const waiting = whenSavesSettled(10_000);
    useCloudSaveStore.setState({ inFlight: 1 });
    let result: boolean | null = null;
    void waiting.then((r) => (result = r));
    await Promise.resolve();
    expect(result).toBeNull();
    useCloudSaveStore.setState({ inFlight: 0 });
    await expect(waiting).resolves.toBe(true);
  });

  it('resolves false at the timeout (10 s by default)', async () => {
    vi.useFakeTimers();
    useCloudSaveStore.setState({ inFlight: 1 });
    const waiting = whenSavesSettled();
    let result: boolean | null = null;
    void waiting.then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(result).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await expect(waiting).resolves.toBe(false);
  });
});
