// @vitest-environment jsdom
/**
 * usePrefsSync: the editor shell's hold on the student's prefs (prefsStore).
 *
 * Mounted with the signed-in student's id, it puts their prefs into the store
 * and saves their changes. When the id changes (a shared Chromebook, a sign
 * out), the last student's waiting change is saved under their key before the
 * next student's prefs replace theirs. Unmounting (leaving the editor) saves
 * what is waiting and stops listening. A re-render for the same student
 * leaves the sync running.
 *
 * Each case stores every pref for its students, so what an earlier case left
 * in the store never matters. prefsStore's own suite covers the rest.
 *
 * Run: npx vitest run src/daw/hooks/__tests__/usePrefsSync.test.tsx
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fieldDefault,
  USER_PREF_KEYS,
} from '@/daw/persistence/projectDocument/fields';
import { prefsStorageKey } from '@/daw/persistence/prefsStore';
import { useStore } from '@/daw/store';
import { usePrefsSync } from '../usePrefsSync';

const A = 'student-a';
const B = 'student-b';

const DEFAULTS = Object.fromEntries(
  USER_PREF_KEYS.map((key) => [key, fieldDefault(key)]),
);
const A_PREFS = {
  ...DEFAULTS,
  metronomeEnabled: true,
  countInBars: 2,
  chordRulerShowNotes: true,
};
const B_PREFS = { ...DEFAULTS, timelineSnapEnabled: false };

const s = () => useStore.getState();

const held = () =>
  Object.fromEntries(USER_PREF_KEYS.map((key) => [key, s()[key]]));

function stored(userId: string): Record<string, unknown> {
  const raw = localStorage.getItem(prefsStorageKey(userId));
  return (JSON.parse(raw ?? '{}') as { prefs: Record<string, unknown> }).prefs;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(
    prefsStorageKey(A),
    JSON.stringify({ v: 1, prefs: A_PREFS }),
  );
  localStorage.setItem(
    prefsStorageKey(B),
    JSON.stringify({ v: 1, prefs: B_PREFS }),
  );
});

afterEach(() => {
  // No vitest globals here, so Testing Library doesn't unmount on its own;
  // a sync left running would write in the next case.
  cleanup();
  vi.useRealTimers();
});

describe('usePrefsSync', () => {
  it('puts the student’s prefs into the store when it mounts', () => {
    renderHook(() => usePrefsSync(A));

    expect(held()).toEqual(A_PREFS);
  });

  it('saves a change under the student’s key', () => {
    renderHook(() => usePrefsSync(A));
    s().toggleTimelineSnap();
    vi.advanceTimersByTime(300);

    expect(stored(A).timelineSnapEnabled).toBe(false);
    expect(stored(B)).toEqual(B_PREFS);
  });

  it('on a change of student, saves the last one’s waiting change and applies the next one’s prefs', () => {
    const { rerender } = renderHook(({ userId }) => usePrefsSync(userId), {
      initialProps: { userId: A },
    });
    s().setCountInBars(1);

    rerender({ userId: B });

    expect(stored(A).countInBars).toBe(1);
    expect(held()).toEqual(B_PREFS);
  });

  it('leaves the sync running across a re-render for the same student', () => {
    const { rerender } = renderHook(({ userId }) => usePrefsSync(userId), {
      initialProps: { userId: A },
    });
    s().toggleMetronome();

    // A restart would have written the change at once.
    rerender({ userId: A });
    expect(stored(A).metronomeEnabled).toBe(true);

    vi.advanceTimersByTime(300);
    expect(stored(A).metronomeEnabled).toBe(false);
  });

  it('on unmount, saves what is waiting and stops listening', () => {
    const { unmount } = renderHook(() => usePrefsSync(A));
    s().toggleChordRulerLabels();
    unmount();
    expect(stored(A).chordRulerShowNotes).toBe(false);

    s().toggleChordRulerLabels();
    vi.advanceTimersByTime(1000);
    expect(stored(A).chordRulerShowNotes).toBe(false);
  });

  it('waits until auth knows who the student is', () => {
    // Signing in: no id yet, and not known to be signed out either.
    const { rerender } = renderHook(
      ({ userId, ready }) => usePrefsSync(userId, ready),
      { initialProps: { userId: null as string | null, ready: false } },
    );
    s().setCountInBars(1);
    vi.advanceTimersByTime(300);
    // Nothing applied, seeded or saved for 'anon'.
    expect(localStorage.getItem(prefsStorageKey(null))).toBeNull();

    rerender({ userId: A, ready: true });
    expect(held()).toEqual(A_PREFS);
    s().toggleTimelineSnap();
    vi.advanceTimersByTime(300);
    expect(stored(A).timelineSnapEnabled).toBe(false);
    expect(localStorage.getItem(prefsStorageKey(null))).toBeNull();
  });
});
