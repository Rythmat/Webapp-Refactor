// @vitest-environment jsdom
/**
 * A draft written before 1.3 carries the metronome, which is a per-user pref
 * now (decision D5). Loading such a draft hands it to prefsStore's
 * adoptLegacyPrefs rather than putting it in the store: it becomes the
 * student's own only while they have no prefs yet. A student with prefs
 * restoring an old kept slot, an old tab's autosave or a rolled-back build's
 * keeps their own, in the store and in storage.
 *
 * Each case loads a fresh store, prefsStore and SessionSerializer
 * (vi.resetModules): prefsStore remembers whose prefs the store holds for as
 * long as the page lives.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/legacyPrefs.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StoreModule = typeof import('@/daw/store');
type PrefsModule = typeof import('../prefsStore');
type SerializerModule = typeof import('../SessionSerializer');

let useStore: StoreModule['useStore'];
let prefs: PrefsModule;
let serializer: SerializerModule;
let stop: () => void = () => {};

const fixture = (path: string) =>
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'src/daw/persistence/__tests__/fixtures', path),
      'utf8',
    ),
  );

/** A draft 1.2 wrote, with the metronome as `on`. */
function v2Draft(on: boolean) {
  const draft = fixture('v2-1.2/new-project.json');
  draft.data.transport.metronomeEnabled = on;
  return draft;
}

/** What storage holds as `userId`'s prefs; null when nothing is stored. */
function storedPrefs(userId: string): Record<string, unknown> | null {
  const raw = localStorage.getItem(prefs.prefsStorageKey(userId));
  return raw === null ? null : JSON.parse(raw).prefs;
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  ({ useStore } = await import('@/daw/store'));
  prefs = await import('../prefsStore');
  serializer = await import('../SessionSerializer');
  vi.useFakeTimers();
});

afterEach(() => {
  stop();
  stop = () => {};
  vi.useRealTimers();
});

describe('the metronome of a draft written before prefs', () => {
  it('never overrides a student who has prefs', () => {
    localStorage.setItem(
      prefs.prefsStorageKey('u1'),
      JSON.stringify({ v: 1, prefs: { metronomeEnabled: false } }),
    );
    stop = prefs.startPrefsSync('u1');

    expect(serializer.deserializeSession(v2Draft(true))).toBe(true);
    vi.advanceTimersByTime(1000);

    expect(useStore.getState().metronomeEnabled).toBe(false);
    expect(storedPrefs('u1')).toEqual({ metronomeEnabled: false });
  });

  it('becomes a student’s own on their first visit', () => {
    stop = prefs.startPrefsSync('u1');

    serializer.deserializeSession(v2Draft(true));
    vi.advanceTimersByTime(1000);

    expect(useStore.getState().metronomeEnabled).toBe(true);
    expect(storedPrefs('u1')).toEqual({ metronomeEnabled: true });
  });

  it('is kept when restored before the editor starts the prefs', () => {
    // golden.mjs and a restore before the editor mounts load this way.
    serializer.deserializeSession(v2Draft(true));
    expect(useStore.getState().metronomeEnabled).toBe(true);

    stop = prefs.startPrefsSync('u1');
    expect(useStore.getState().metronomeEnabled).toBe(true);
    expect(storedPrefs('u1')).toEqual({ metronomeEnabled: true });
  });

  it('comes from no v3 draft', () => {
    stop = prefs.startPrefsSync('u1');
    useStore.getState().toggleMetronome();
    vi.advanceTimersByTime(1000);

    serializer.deserializeSession(fixture('v3-all-fields/all-fields.json'));
    vi.advanceTimersByTime(1000);

    expect(useStore.getState().metronomeEnabled).toBe(true);
    expect(storedPrefs('u1')).toEqual({ metronomeEnabled: true });
  });
});
