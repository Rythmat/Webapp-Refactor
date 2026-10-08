import { shallow } from 'zustand/shallow';
import {
  fieldDefault,
  USER_PREF_KEYS,
  type PrefKey,
} from '@/daw/persistence/projectDocument/fields';
import { userNamespace } from '@/daw/persistence/storageNamespace';
import { useStore, type AllSlices } from '@/daw/store';
import { ALL_GRID_VALUES, type AllGridSize } from '@/daw/utils/quantize';

// ── Per-user editor preferences ────────────────────────────────────────────
//
// A few editor settings belong to the student rather than to a project: the
// metronome, the count-in, the timeline's snap, grid and triplets, and
// whether the chord ruler shows note names (the registry's 'pref' scope,
// decision D5). They follow the student from project to project, so a new
// project, a template or a restored draft leaves them as they are. Each
// user's are kept under their own key, so on a shared school Chromebook
// every student finds their own settings and never someone else's.
//
// A draft written before prefs were kept per user carries the metronome. The
// codec hands it to adoptLegacyPrefs, which makes it the student's own only
// while they have no prefs yet, and only once.
//
// The audio input and its channel-count override are prefs too, but of the
// computer rather than the student: they keep their own per-device keys
// (audioIOSlice) and aren't handled here.

/** Each user's prefs are stored under this prefix plus their encoded id. */
export const PREFS_STORAGE_PREFIX = 'musicAtlas:daw:prefs:';

/**
 * The stored entry: `{v: 1, prefs: {metronomeEnabled: true, …}}`. It holds
 * the settings the student has set; one they never set is left out, so it
 * keeps following the registry's default if that changes. An entry with a
 * higher v was written by a later build: this one reads the prefs it knows
 * from it and never writes over it.
 */
const PREFS_FORMAT = 1;

// Wait this long after the last change before writing, so clicking through
// the count-in or toggling snap a few times costs one write.
const WRITE_DEBOUNCE_MS = 300;

/** The computer's two prefs, which keep their own storage (see above). */
type DevicePrefKey = 'inputDeviceId' | 'inputChannelCountOverride';

/** A pref kept per user. */
export type UserPrefKey = Exclude<PrefKey, DevicePrefKey>;

/** The per-user prefs, as the editor store holds them. */
export type UserPrefs = Pick<AllSlices, UserPrefKey>;

const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

/**
 * What a pref must be for the editor to take it, from storage or from a
 * draft, and for this module to store it. Anything else (an entry edited by
 * hand, a build that stores it another way, a loader that put junk in the
 * store) is skipped, as if it weren't there.
 */
const IS_VALID: {
  [K in UserPrefKey]: (value: unknown) => value is AllSlices[K];
} = {
  metronomeEnabled: isBoolean,
  // Off, one bar or two, as setCountInBars allows.
  countInBars: (value): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 2,
  timelineSnapEnabled: isBoolean,
  timelineGridSize: (value): value is AllGridSize =>
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ALL_GRID_VALUES, value),
  timelineTripletMode: isBoolean,
  chordRulerShowNotes: isBoolean,
};

/**
 * The keys, in the registry's order: its pref scope less the computer's two
 * (USER_PREF_KEYS). The prefs test holds IS_VALID to the same list.
 */
const USER_PREFS = USER_PREF_KEYS as readonly UserPrefKey[];

/** Where a user's prefs are kept; signed out, 'anon'. */
export function prefsStorageKey(userId: string | null): string {
  return `${PREFS_STORAGE_PREFIX}${userNamespace(userId)}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A user's stored entry, as readStoredEntry finds it. */
interface StoredEntry {
  /** The whole entry: a later build may keep more in it than the prefs. */
  entry: Record<string, unknown>;
  /** Its prefs as stored; empty when a later build keeps them another way. */
  prefs: Record<string, unknown>;
  /** Written by a later build (a higher v): read it, never write over it. */
  newer: boolean;
}

/**
 * A user's stored entry, or null when there is none to keep: nothing stored,
 * storage closed to this page, or something that isn't an entry, which may
 * be written over. Never throws.
 */
function readStoredEntry(userId: string | null): StoredEntry | null {
  try {
    const raw = localStorage.getItem(prefsStorageKey(userId));
    if (raw === null) return null;
    const entry: unknown = JSON.parse(raw);
    if (!isRecord(entry)) return null;
    const newer = typeof entry.v === 'number' && entry.v > PREFS_FORMAT;
    if (isRecord(entry.prefs)) return { entry, prefs: entry.prefs, newer };
    // A later build may keep its prefs another way; in this build's own
    // format, an entry without them is junk.
    return newer ? { entry, prefs: {}, newer } : null;
  } catch {
    // Not JSON, or storage is closed to this page (a sandboxed frame, blocked
    // site data).
    return null;
  }
}

function takeIfValid<K extends UserPrefKey>(
  into: Partial<UserPrefs>,
  key: K,
  value: unknown,
): void {
  if (IS_VALID[key](value)) into[key] = value;
}

/** The valid prefs among `values`, which may hold anything. */
function validPrefs(values: {
  readonly [key: string]: unknown;
}): Partial<UserPrefs> {
  const prefs: Partial<UserPrefs> = {};
  for (const key of USER_PREFS) takeIfValid(prefs, key, values[key]);
  return prefs;
}

/**
 * A user's stored prefs: each one that is stored and valid, and nothing else.
 * Never throws: a missing, unreadable or junk entry reads as no prefs.
 */
export function readPrefs(
  userId: string | null,
): Partial<Pick<AllSlices, PrefKey>> {
  return validPrefs(readStoredEntry(userId)?.prefs ?? {});
}

/**
 * Put a user's stored prefs into the editor store: only the ones stored, so a
 * setting they never chose keeps the value it has.
 */
export function applyPrefs(userId: string | null): void {
  const prefs = readPrefs(userId);
  if (Object.keys(prefs).length > 0) useStore.setState(prefs);
}

/**
 * Store `prefs` over the user's entry. The rest of it stays: prefs this build
 * doesn't know, and anything kept beside them. An entry a later build wrote
 * is never written over, so the change holds on this page only. Full or
 * closed storage only costs the saving: the settings still apply here.
 */
function writePrefs(userId: string | null, prefs: Partial<UserPrefs>): void {
  const stored = readStoredEntry(userId);
  if (stored?.newer) return;
  try {
    localStorage.setItem(
      prefsStorageKey(userId),
      JSON.stringify({
        ...stored?.entry,
        v: PREFS_FORMAT,
        prefs: { ...stored?.prefs, ...prefs },
      }),
    );
  } catch (err) {
    console.warn('[prefs] Could not save the editor preferences', err);
  }
}

/** The prefs as the editor store holds them now. */
function currentPrefs(): UserPrefs {
  const state = useStore.getState();
  return Object.fromEntries(
    USER_PREFS.map((key) => [key, state[key]]),
  ) as UserPrefs;
}

/** Every pref at its registry default. */
function defaultPrefs(): UserPrefs {
  return Object.fromEntries(
    USER_PREFS.map((key) => [key, fieldDefault(key)]),
  ) as UserPrefs;
}

/**
 * A student's first visit on this device: save the editor's settings as
 * theirs, but only those that differ from the defaults. Even an empty entry
 * is written, so the next visit isn't a first one.
 */
function seedPrefs(userId: string | null): void {
  const defaults = defaultPrefs();
  const seeded = validPrefs(currentPrefs());
  for (const key of USER_PREFS) {
    if (Object.is(seeded[key], defaults[key])) delete seeded[key];
  }
  writePrefs(userId, seeded);
}

// ── Keeping them while the editor is open ──────────────────────────────────

/**
 * Whose prefs the editor store holds: the storage key of the user the last
 * sync started for. Null before the first sync on this page, while the store
 * still holds what the page started with (and any metronome an older draft
 * restored before the editor opened).
 */
let heldKey: string | null = null;

/** The running sync's stop: one sync runs at a time. */
let stopRunning: (() => void) | null = null;

/**
 * Whether the running sync's student is on their first visit and hasn't set
 * anything since: while it holds, an older draft may still give them its
 * metronome (adoptLegacyPrefs).
 */
let firstVisit = false;

/** Whether an older draft's prefs were taken on this page: only once. */
let legacyTaken = false;

/**
 * Keep `userId`'s prefs while the editor is open (null is signed out). It
 * puts theirs into the store, then saves each change 300 ms after the last
 * one, and at once when the page is hidden or closed. Returns the stop, which
 * saves a change still waiting.
 *
 * - A student with stored prefs gets them, and every setting they never set
 *   goes to its default, so nothing of another student's shows through on a
 *   shared Chromebook.
 * - A student with none yet (their first time on this device) keeps what the
 *   editor is set to, saved as theirs: on the page's first sync that is how
 *   the student had it before prefs were kept per user; after another
 *   student's prefs, the defaults.
 *
 * Another tab's changes aren't taken while this one runs: each tab writes
 * only what changed in it, over the stored entry, so neither loses the
 * other's, and the next start reads both.
 */
export function startPrefsSync(userId: string | null): () => void {
  stopRunning?.();
  const key = prefsStorageKey(userId);
  const stored = readStoredEntry(userId);
  if (stored === null) {
    // A first visit: after another student's prefs, from the defaults.
    if (heldKey !== null && heldKey !== key) useStore.setState(defaultPrefs());
    seedPrefs(userId);
    // An older draft may still give them its metronome, unless one already
    // gave its own on this page.
    firstVisit = heldKey !== key && !legacyTaken;
  } else {
    // Theirs, and the default for each one they never set. When the editor
    // opens again for the same student, the store already holds theirs.
    const prefs = validPrefs(stored.prefs);
    if (heldKey !== key) useStore.setState({ ...defaultPrefs(), ...prefs });
    else if (Object.keys(prefs).length > 0) useStore.setState(prefs);
    firstVisit = false;
  }
  heldKey = key;

  // Prefs changed on this page since they were last written. Only these are
  // written, over the stored entry, so a second tab's changes survive.
  const changed = new Set<UserPrefKey>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const now = currentPrefs();
    // Only valid values: junk a loader put into the store must never replace
    // (or, as undefined, delete) what the student has stored.
    const prefs: Partial<UserPrefs> = {};
    for (const k of changed) takeIfValid(prefs, k, now[k]);
    changed.clear();
    if (Object.keys(prefs).length > 0) writePrefs(userId, prefs);
  };
  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(write, WRITE_DEBOUNCE_MS);
  };
  // The page may get no other chance: write what is waiting, now
  // (localStorage is synchronous, so it lands before the page goes).
  const flush = () => {
    if (timer !== null) write();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush();
  };

  const unsubscribe = useStore.subscribe(
    (state) => USER_PREFS.map((k) => state[k]),
    (values, previous) => {
      USER_PREFS.forEach((k, i) => {
        if (!Object.is(values[i], previous[i])) changed.add(k);
      });
      // The student has set something of their own now.
      firstVisit = false;
      schedule();
    },
    { equalityFn: shallow },
  );
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onVisibilityChange);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    unsubscribe();
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    // A change still waiting is this user's: write it before another user's
    // prefs replace it.
    flush();
    if (stopRunning === stop) {
      stopRunning = null;
      firstVisit = false;
    }
  };
  stopRunning = stop;
  return stop;
}

/**
 * Prefs found in a draft written before prefs were kept per user: today its
 * metronome (transport.metronomeEnabled). The codec hands them here rather
 * than putting them into the store itself, and they become the student's own
 * only while the student has none yet, once a page:
 *
 * - before the editor first starts the sync on this page, they go into the
 *   store, and the sync's first visit saves them as the student's (a student
 *   with prefs gets theirs instead);
 * - while the running sync's student is on their first visit and hasn't set
 *   anything, they go into the store and are saved as theirs.
 *
 * Anywhere else they are ignored: a student with prefs restoring an old
 * draft, an old tab's autosave or a rolled-back build's keeps their own.
 * Invalid values are always ignored.
 */
export function adoptLegacyPrefs(values: {
  readonly [K in UserPrefKey]?: unknown;
}): void {
  const prefs = validPrefs(values);
  if (Object.keys(prefs).length === 0) return;
  if (heldKey !== null) {
    if (!firstVisit) return;
    firstVisit = false;
  }
  legacyTaken = true;
  useStore.setState(prefs);
}
