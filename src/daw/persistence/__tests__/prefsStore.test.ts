// @vitest-environment jsdom
/**
 * Per-user editor prefs (prefsStore, decision D5).
 *
 * The metronome, count-in, snap, grid, triplets and chord-ruler note names
 * belong to the student, not the project. They are kept per user in
 * localStorage, so that on a shared school Chromebook nobody gets someone
 * else's. These cases pin:
 *
 * - where they are kept (one key per user, the computer's input settings
 *   left on their own keys);
 * - that junk in storage, or storage closed to the page, is survived, and an
 *   entry a later build wrote is read but never written over;
 * - when a change is written (300 ms after the last one, and at once on
 *   pagehide, on hidden and on stop) and that only valid values are;
 * - what starting does: a student's stored prefs are applied, a first visit
 *   keeps the editor's settings as theirs (storing only what differs from
 *   the defaults), and a different student on the same computer never sees
 *   the last one's;
 * - that another tab's change survives this tab's writes;
 * - that a draft from before prefs were kept per user gives its metronome to
 *   a student with no prefs yet, once, and never overrides one who has them.
 *
 * Each case loads a fresh store and prefsStore (vi.resetModules): prefsStore
 * remembers whose prefs the store holds for as long as the page lives.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/prefsStore.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fieldDefault,
  USER_PREF_KEYS,
} from '@/daw/persistence/projectDocument/fields';

type StoreModule = typeof import('@/daw/store');
type PrefsModule = typeof import('../prefsStore');

let useStore: StoreModule['useStore'];
let prefs: PrefsModule;
let stops: (() => void)[] = [];

const A = 'student-a';
const B = 'student-b';

/** One valid value for every per-user pref, none of them the default. */
const CHOSEN = {
  metronomeEnabled: true,
  countInBars: 2,
  timelineSnapEnabled: false,
  timelineGridSize: '1/8T',
  timelineTripletMode: true,
  chordRulerShowNotes: true,
} as const;

const DEFAULTS = Object.fromEntries(
  USER_PREF_KEYS.map((key) => [key, fieldDefault(key)]),
);

const s = () => useStore.getState();
const keyOf = (userId: string | null) => prefs.prefsStorageKey(userId);

/** The user prefs the editor store holds now. */
const held = () =>
  Object.fromEntries(USER_PREF_KEYS.map((key) => [key, s()[key]]));

/** Put an entry in storage, as a JSON value or a raw string. */
function storeEntry(userId: string | null, value: unknown): void {
  localStorage.setItem(
    keyOf(userId),
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}

/** The whole entry stored for a user, or null when nothing is stored. */
function entry(userId: string | null): Record<string, unknown> | null {
  const raw = localStorage.getItem(keyOf(userId));
  return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
}

/** The prefs object stored for a user, or null when nothing is stored. */
function stored(userId: string | null): Record<string, unknown> | null {
  return (entry(userId)?.prefs as Record<string, unknown> | undefined) ?? null;
}

function storageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)!);
  return keys.sort();
}

/** Start the sync, stopping it after the case. */
function start(userId: string | null): () => void {
  const stop = prefs.startPrefsSync(userId);
  stops.push(stop);
  return stop;
}

/** Hide the tab, as switching to another tab or minimising the window does. */
function hideTab(): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  });
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
}

/** Another tab of the same browser wrote this user's prefs. */
function otherTabWrites(userId: string | null, value: unknown): void {
  storeEntry(userId, value);
  window.dispatchEvent(new StorageEvent('storage', { key: keyOf(userId) }));
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  ({ useStore } = await import('@/daw/store'));
  prefs = await import('../prefsStore');
  vi.useFakeTimers();
});

afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  Reflect.deleteProperty(document, 'visibilityState');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('where prefs are kept', () => {
  it('keeps each student’s prefs under their own key', () => {
    start(A);
    s().toggleMetronome();
    s().setCountInBars(2);
    vi.advanceTimersByTime(300);

    expect(stored(A)).toEqual({ metronomeEnabled: true, countInBars: 2 });
    expect(storageKeys()).toEqual([keyOf(A)]);
  });

  it('encodes the id as kept work does, and files a signed-out student under anon', () => {
    expect(prefs.PREFS_STORAGE_PREFIX).toBe('musicAtlas:daw:prefs:');
    expect(keyOf(A)).toBe('musicAtlas:daw:prefs:student-a');
    // Encoded, so an id can't reach into another key.
    expect(keyOf('auth0|a:b')).toBe('musicAtlas:daw:prefs:auth0%7Ca%3Ab');
    expect(keyOf(null)).toBe('musicAtlas:daw:prefs:anon');
    expect(keyOf('')).toBe('musicAtlas:daw:prefs:anon');
  });

  it('keeps the six user prefs and leaves the computer’s input settings alone', () => {
    start(A);
    useStore.setState({
      ...CHOSEN,
      inputDeviceId: 'usb-interface',
      inputChannelCountOverride: 2,
    });
    vi.advanceTimersByTime(300);

    expect(stored(A)).toEqual(CHOSEN);
    expect(storageKeys()).toEqual([keyOf(A)]);
  });

  it('reads back every per-user pref the registry lists', () => {
    // A pref added to the registry fails here until prefsStore can read it.
    expect(Object.keys(CHOSEN).sort()).toEqual([...USER_PREF_KEYS].sort());
    storeEntry(A, { v: 1, prefs: CHOSEN });

    expect(prefs.readPrefs(A)).toEqual(CHOSEN);
  });
});

describe('reading what is stored', () => {
  it('reads junk as no prefs, and never throws', () => {
    const junk = [
      'not json {',
      '42',
      '"text"',
      'null',
      '[]',
      '{"v":1}',
      '{"v":1,"prefs":[]}',
      '{"v":1,"prefs":"metronomeEnabled"}',
    ];
    for (const raw of junk) {
      storeEntry(A, raw);
      expect(prefs.readPrefs(A)).toEqual({});
      expect(() => prefs.applyPrefs(A)).not.toThrow();
    }
    expect(held()).toEqual(DEFAULTS);
  });

  it('takes each valid pref and skips the rest', () => {
    storeEntry(A, {
      v: 1,
      prefs: {
        metronomeEnabled: 'yes',
        countInBars: 5,
        timelineSnapEnabled: false,
        // On the prototype of the grid table, not one of its sizes.
        timelineGridSize: 'toString',
        timelineTripletMode: 1,
        chordRulerShowNotes: true,
        aLaterPref: 3,
      },
    });
    expect(prefs.readPrefs(A)).toEqual({
      timelineSnapEnabled: false,
      chordRulerShowNotes: true,
    });

    storeEntry(A, {
      v: 1,
      prefs: { countInBars: 1.5, timelineGridSize: '1/3' },
    });
    expect(prefs.readPrefs(A)).toEqual({});
  });

  it('reads the prefs it knows from a later format', () => {
    storeEntry(A, { v: 2, prefs: { metronomeEnabled: true, layout: {} } });

    expect(prefs.readPrefs(A)).toEqual({ metronomeEnabled: true });
  });

  it('reads nothing, and starts anyway, when storage is closed to the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(prefs.readPrefs(A)).toEqual({});
    expect(() => start(A)).not.toThrow();
    s().toggleMetronome();
    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
    // The setting still applies on this page.
    expect(s().metronomeEnabled).toBe(true);
  });

  it('applies only the prefs that are stored', () => {
    s().setCountInBars(1);
    storeEntry(A, { v: 1, prefs: { metronomeEnabled: true } });

    prefs.applyPrefs(A);

    expect(s().metronomeEnabled).toBe(true);
    expect(s().countInBars).toBe(1);
  });
});

describe('writing changes', () => {
  it('writes once, 300 ms after the last of a burst of changes', () => {
    start(A);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    s().toggleTimelineSnap();
    vi.advanceTimersByTime(100);
    s().toggleTimelineSnap();
    vi.advanceTimersByTime(100);
    s().toggleTimelineSnap();
    vi.advanceTimersByTime(299);
    expect(writes).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(stored(A)!.timelineSnapEnabled).toBe(false);
  });

  it('writes a waiting change at once when the page is closed', () => {
    start(A);
    s().toggleMetronome();
    window.dispatchEvent(new Event('pagehide'));

    expect(stored(A)!.metronomeEnabled).toBe(true);
  });

  it('writes a waiting change at once when the tab is hidden', () => {
    start(A);
    s().setCountInBars(1);
    hideTab();

    expect(stored(A)!.countInBars).toBe(1);
  });

  it('writes a waiting change on stop, then stops listening', () => {
    const stop = start(A);
    s().toggleChordRulerLabels();
    stop();
    expect(stored(A)!.chordRulerShowNotes).toBe(true);

    s().toggleChordRulerLabels();
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('pagehide'));
    expect(stored(A)!.chordRulerShowNotes).toBe(true);
  });

  it('carries on when storage is full', () => {
    start(A);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    s().toggleMetronome();

    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(s().metronomeEnabled).toBe(true);
  });

  it('never stores an invalid value, nor deletes a stored one for it', () => {
    storeEntry(A, { v: 1, prefs: { metronomeEnabled: true } });
    start(A);
    // As a loader could leave them: a draft without the field, a bad value.
    useStore.setState({
      metronomeEnabled: undefined as unknown as boolean,
      countInBars: 7,
    });
    vi.advanceTimersByTime(300);

    expect(stored(A)).toEqual({ metronomeEnabled: true });
  });

  it('keeps what it doesn’t know, in the prefs and beside them', () => {
    storeEntry(A, {
      v: 1,
      prefs: { aLaterPref: 3 },
      layout: { dock: 220 },
    });
    start(A);
    s().toggleMetronome();
    vi.advanceTimersByTime(300);

    expect(entry(A)).toEqual({
      v: 1,
      prefs: { aLaterPref: 3, metronomeEnabled: true },
      layout: { dock: 220 },
    });
  });

  it('never writes over an entry a later build wrote', () => {
    const later = JSON.stringify({
      v: 2,
      prefs: { ...DEFAULTS, metronomeEnabled: true },
      layout: { dock: 220 },
    });
    storeEntry(A, later);
    const stop = start(A);
    expect(s().metronomeEnabled).toBe(true);

    s().toggleMetronome();
    s().setCountInBars(1);
    vi.advanceTimersByTime(300);
    s().toggleTimelineSnap();
    window.dispatchEvent(new Event('pagehide'));
    s().toggleTimelineSnap();
    stop();

    expect(localStorage.getItem(keyOf(A))).toBe(later);
    // The changes still hold on this page.
    expect(s().metronomeEnabled).toBe(false);
    expect(s().countInBars).toBe(1);
  });

  it('leaves alone a later build’s entry it can’t read, and starts on the defaults', () => {
    const later = JSON.stringify({
      v: 2,
      prefs: 'base64-packed',
      settings: { metronomeEnabled: true },
    });
    storeEntry(A, later);
    useStore.setState({ countInBars: 2 });
    start(A);
    expect(held()).toEqual(DEFAULTS);

    s().toggleMetronome();
    vi.advanceTimersByTime(300);
    expect(localStorage.getItem(keyOf(A))).toBe(later);
  });

  it('writes over junk', () => {
    storeEntry(A, 'not json {');
    start(A);

    expect(entry(A)).toEqual({ v: 1, prefs: {} });
  });
});

describe('starting', () => {
  it('gives a student their stored prefs', () => {
    storeEntry(A, { v: 1, prefs: CHOSEN });
    start(A);

    expect(held()).toEqual(CHOSEN);
  });

  it('keeps the editor’s settings as theirs on a student’s first visit', () => {
    // How the editor was set before prefs were kept per user: the metronome
    // a draft carried, the count-in chosen earlier on this page.
    useStore.setState({ metronomeEnabled: true, countInBars: 2 });
    start(A);

    expect(held()).toEqual({
      ...DEFAULTS,
      metronomeEnabled: true,
      countInBars: 2,
    });
    // Only what differs from the defaults: a default the student never set
    // keeps following the registry.
    expect(stored(A)).toEqual({ metronomeEnabled: true, countInBars: 2 });
  });

  it('marks a first visit at the defaults with an empty entry', () => {
    start(A);

    expect(entry(A)).toEqual({ v: 1, prefs: {} });
    expect(held()).toEqual(DEFAULTS);
  });

  it('puts every setting a student with prefs never set at its default', () => {
    // What the page held before the editor opened is not theirs.
    useStore.setState({ metronomeEnabled: true, timelineSnapEnabled: false });
    storeEntry(A, { v: 1, prefs: { countInBars: 1 } });
    start(A);

    expect(held()).toEqual({ ...DEFAULTS, countInBars: 1 });
    expect(stored(A)).toEqual({ countInBars: 1 });
  });

  it('keeps a student’s settings when the editor opens again', () => {
    const stop = start(A);
    s().setCountInBars(2);
    s().toggleMetronome();
    stop();

    start(A);
    expect(held()).toEqual({
      ...DEFAULTS,
      metronomeEnabled: true,
      countInBars: 2,
    });
  });
});

describe('a different student on the same computer', () => {
  it('puts the next student’s prefs in place of the last one’s', () => {
    storeEntry(A, { v: 1, prefs: CHOSEN });
    start(A)();
    expect(held()).toEqual(CHOSEN);

    // B has chosen only these two; nothing else of A's may show through.
    storeEntry(B, { v: 1, prefs: { metronomeEnabled: false, countInBars: 1 } });
    start(B);

    expect(held()).toEqual({ ...DEFAULTS, countInBars: 1 });
  });

  it('gives a student with no prefs the defaults, not the last student’s', () => {
    storeEntry(A, { v: 1, prefs: CHOSEN });
    start(A)();
    start(B);

    expect(held()).toEqual(DEFAULTS);
    expect(entry(B)).toEqual({ v: 1, prefs: {} });
    expect(stored(A)).toEqual(CHOSEN);
  });

  it('saves the last student’s waiting change under their own key', () => {
    start(A);
    s().toggleMetronome();
    // The next start ends A's sync, as a change of user does.
    start(B);

    expect(stored(A)).toEqual({ metronomeEnabled: true });
    expect(stored(B)).toEqual({});
    expect(s().metronomeEnabled).toBe(false);
    s().setCountInBars(2);
    vi.advanceTimersByTime(300);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
    expect(stored(B)).toEqual({ countInBars: 2 });
  });

  it('switches between signed in and signed out the same way', () => {
    storeEntry(A, { v: 1, prefs: CHOSEN });
    start(A)();
    start(null);

    expect(held()).toEqual(DEFAULTS);
    expect(entry(null)).toEqual({ v: 1, prefs: {} });
  });
});

describe('another tab', () => {
  it('keeps another tab’s change when it writes its own, and takes it on the next start', () => {
    start(A);
    otherTabWrites(A, { v: 1, prefs: { metronomeEnabled: true } });
    // Not taken while this sync runs, and nothing written for it.
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    vi.advanceTimersByTime(300);
    expect(writes).not.toHaveBeenCalled();
    expect(s().metronomeEnabled).toBe(false);

    s().toggleTimelineSnap();
    vi.advanceTimersByTime(300);
    expect(stored(A)).toEqual({
      metronomeEnabled: true,
      timelineSnapEnabled: false,
    });

    stops.pop()!();
    start(A);
    expect(s().metronomeEnabled).toBe(true);
    expect(s().timelineSnapEnabled).toBe(false);
  });
});

describe('a draft from before prefs were kept per user', () => {
  it('gives its metronome to a student on their first visit, and saves it', () => {
    start(A);
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });

    expect(s().metronomeEnabled).toBe(true);
    vi.advanceTimersByTime(300);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
  });

  it('gives it only once', () => {
    start(A);
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    prefs.adoptLegacyPrefs({ metronomeEnabled: false });
    vi.advanceTimersByTime(300);

    expect(s().metronomeEnabled).toBe(true);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
  });

  it('never overrides a student who has prefs', () => {
    storeEntry(A, { v: 1, prefs: { metronomeEnabled: true } });
    start(A);
    // An old kept draft restored, an old tab's autosave, a rolled-back
    // build's: all carry the metronome off.
    prefs.adoptLegacyPrefs({ metronomeEnabled: false });
    vi.advanceTimersByTime(300);

    expect(s().metronomeEnabled).toBe(true);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
  });

  it('leaves the student’s choice alone once they have set something', () => {
    start(A);
    s().setCountInBars(1);
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    vi.advanceTimersByTime(300);

    expect(s().metronomeEnabled).toBe(false);
    expect(stored(A)).toEqual({ countInBars: 1 });
  });

  it('keeps one restored before the editor opened, for a student’s first visit', () => {
    // Kept work restored from a song page, say, before the editor mounts.
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    expect(s().metronomeEnabled).toBe(true);
    start(A);

    expect(s().metronomeEnabled).toBe(true);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
    // That was the once.
    prefs.adoptLegacyPrefs({ metronomeEnabled: false });
    expect(s().metronomeEnabled).toBe(true);
  });

  it('drops one restored before the editor opened when the student has prefs', () => {
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    storeEntry(A, { v: 1, prefs: { countInBars: 1 } });
    start(A);

    expect(held()).toEqual({ ...DEFAULTS, countInBars: 1 });
    expect(stored(A)).toEqual({ countInBars: 1 });
  });

  it('gives none to the next student once one was given on this page', () => {
    start(A);
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    start(B);
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });

    expect(s().metronomeEnabled).toBe(false);
    expect(stored(B)).toEqual({});
  });

  it('gives none while the editor is closed', () => {
    start(A)();
    // A draft restored outside the editor, after it closed.
    prefs.adoptLegacyPrefs({ metronomeEnabled: true });

    expect(s().metronomeEnabled).toBe(false);
    start(A);
    expect(s().metronomeEnabled).toBe(false);
  });

  it('skips a value that isn’t valid, and takes a valid one after it', () => {
    start(A);
    prefs.adoptLegacyPrefs({ metronomeEnabled: undefined });
    prefs.adoptLegacyPrefs({ metronomeEnabled: 'on' });
    expect(s().metronomeEnabled).toBe(false);
    expect(stored(A)).toEqual({});

    prefs.adoptLegacyPrefs({ metronomeEnabled: true });
    vi.advanceTimersByTime(300);
    expect(stored(A)).toEqual({ metronomeEnabled: true });
  });
});
