import { registerBeforeSignOut } from '@/auth/beforeSignOut';
import {
  ANON_USER_KEY,
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';
import type { CortexId } from './ids';

// ── What this student has done ─────────────────────────────────────────────
//
// One record per activity: when it was first seen, last seen and finished, in
// minutes since 1970 (0: not finished). Kept per user on the device, because
// school Chromebooks are shared, and on the account under the game option
// `cortex`. That store shallow-merges, so with one key per activity two
// devices can't overwrite each other's work. Merging takes the earliest first
// and the latest of the others; counts are left out because they can't merge.
//
// Module-level, not a hook: the done signals fire from stores and mutations,
// and the dashboard around the capture hook remounts per route group.

export type CortexRecord = readonly [first: number, last: number, done: number];
export type CortexRecords = Readonly<Record<string, CortexRecord>>;

/** The option's id in `user_game_options`. */
export const CORTEX_GAME_ID = 'cortex';
/** About 25 KB on the account. */
export const MAX_RECORDS = 500;
const MAX_BATCH = 400;
const SAVE_AFTER_MS = 45_000;
const SAVE_RETRY_MAX_MS = 5 * 60_000;

/** Sends changed records to the account; null removes one. */
export type CortexSink = (
  patch: Record<string, CortexRecord | null>,
  options: { keepalive: boolean },
) => Promise<unknown>;

const toMinutes = (ms: number) => Math.floor(ms / 60_000);

const storageKey = (userKey: string) => `music-atlas-cortex:${userKey}`;

let records: CortexRecords = {};
let dirty = new Set<string>();
let loadedFor: string | null = null;
let sink: CortexSink | null = null;
let current: CortexId | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let retryMs = SAVE_AFTER_MS;
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();

const isRecord = (value: unknown): value is CortexRecord =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n));

/** Earliest first seen, latest last seen and finished. Pure; for tests too. */
export const mergeRecord = (a: CortexRecord, b: CortexRecord): CortexRecord => {
  const firsts = [a[0], b[0]].filter((n) => n > 0);
  return [
    firsts.length > 0 ? Math.min(...firsts) : 0,
    Math.max(a[1], b[1]),
    Math.max(a[2], b[2]),
  ];
};

const same = (a: CortexRecord, b: CortexRecord) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

const persist = () => {
  if (!loadedFor) return;
  try {
    localStorage.setItem(
      storageKey(loadedFor),
      JSON.stringify({ records, dirty: [...dirty] }),
    );
  } catch {
    // Storage full or private browsing: the account copy still gets it.
  }
};

const notify = () => {
  for (const listener of [...listeners]) listener();
};

/** Reads this user's records, once per user. False: no one to write for. */
const ready = (): boolean => {
  const userKey = getLocalStoreUserKey();
  if (!userKey || userKey === ANON_USER_KEY) return false;
  if (loadedFor === userKey) return true;
  loadedFor = userKey;
  records = {};
  dirty = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(userKey)) ?? '{}');
    const next: Record<string, CortexRecord> = {};
    for (const [id, value] of Object.entries(raw.records ?? {}))
      if (isRecord(value)) next[id] = value;
    records = next;
    dirty = new Set(Array.isArray(raw.dirty) ? (raw.dirty as string[]) : []);
  } catch {
    // Nothing readable: start empty; the account copy fills it back in.
  }
  return true;
};

/** Over the cap, the oldest unfinished go first; finished ones only after. */
const evict = (from: Record<string, CortexRecord>) => {
  const over = Object.keys(from).length - MAX_RECORDS;
  if (over <= 0) return;
  const oldest = Object.entries(from)
    .sort(([, a], [, b]) => Number(a[2] > 0) - Number(b[2] > 0) || a[1] - b[1])
    .slice(0, over);
  for (const [id] of oldest) {
    delete from[id];
    dirty.add(id);
  }
};

const schedule = () => {
  if (timer !== null || !sink || dirty.size === 0) return;
  timer = setTimeout(() => {
    timer = null;
    void flushCortex();
  }, retryMs);
};

const write = (id: string, record: CortexRecord) => {
  const was = records[id];
  const next = was ? mergeRecord(was, record) : record;
  if (was && same(was, next)) return;
  const nextRecords = { ...records, [id]: next };
  dirty.add(id);
  evict(nextRecords);
  records = nextRecords;
  persist();
  schedule();
  notify();
};

/** They spent time on it: a dim node. */
export const recordVisit = (id: CortexId, atMs = Date.now()): void => {
  if (!ready()) return;
  const at = toMinutes(atMs);
  write(id, [at, at, 0]);
};

/** They finished or saved it: a bright node. */
export const recordDone = (id: CortexId, atMs = Date.now()): void => {
  if (!ready()) return;
  const at = toMinutes(atMs);
  write(id, [at, at, at]);
};

/** The activity on screen, for done signals that don't know their own id. */
export const setCurrentActivity = (id: CortexId | null): void => {
  current = id;
};

export const markCurrentDone = (): void => {
  if (current) recordDone(current);
};

/** The account's copy, merged in. What it lacks goes back up on the next save. */
export const mergeRemoteRecords = (remote: unknown): void => {
  if (!ready() || typeof remote !== 'object' || remote === null) return;
  const next: Record<string, CortexRecord> = { ...records };
  let changed = false;
  const seen = new Set<string>();
  for (const [id, value] of Object.entries(remote)) {
    if (!isRecord(value)) continue;
    seen.add(id);
    const mine = next[id];
    const merged = mine ? mergeRecord(mine, value) : value;
    if (!same(merged, value)) dirty.add(id);
    if (!mine || !same(mine, merged)) {
      next[id] = merged;
      changed = true;
    }
  }
  for (const id of Object.keys(next)) if (!seen.has(id)) dirty.add(id);
  if (changed) {
    evict(next);
    records = next;
    notify();
  }
  persist();
  schedule();
};

/** Send what changed. Failures keep it marked, to try again later. */
export const flushCortex = (keepalive = false): Promise<void> => {
  if (flushing) return flushing;
  if (!sink || !ready() || dirty.size === 0) return Promise.resolve();
  const ids = [...dirty].slice(0, MAX_BATCH);
  const sent = records;
  const patch: Record<string, CortexRecord | null> = {};
  for (const id of ids) patch[id] = sent[id] ?? null;
  const owner = loadedFor;
  flushing = sink(patch, { keepalive })
    .then(() => {
      retryMs = SAVE_AFTER_MS;
      if (loadedFor !== owner) return;
      for (const id of ids) {
        // Changed again while this was on its way: it goes in the next one.
        const now = records[id];
        const was = sent[id];
        if (now === was) dirty.delete(id);
      }
      persist();
    })
    .catch((err: unknown) => {
      retryMs = Math.min(retryMs * 2, SAVE_RETRY_MAX_MS);
      console.warn('[cortex] saving to the account failed:', err);
    })
    .finally(() => {
      flushing = null;
      schedule();
    });
  return flushing;
};

/** Where saves go; null (no token, or the dev bypass) keeps them on the device. */
export const setCortexSink = (next: CortexSink | null): void => {
  sink = next;
  if (next) {
    ready();
    schedule();
  } else if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
};

/** Everything on record for the signed-in user. Stable until it changes. */
export const getCortexRecords = (): CortexRecords => {
  ready();
  return records;
};

export const subscribeCortex = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// A dead session's batch still goes out; the next person's map stays their own.
registerBeforeSignOut(() => flushCortex(true));
onLocalStoreUserChange(() => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  current = null;
  loadedFor = null;
  records = {};
  dirty = new Set();
  retryMs = SAVE_AFTER_MS;
  notify();
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushCortex(true);
  });
}

/** Tests: back to nothing on record. */
export const resetCortexLedger = (): void => {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  sink = null;
  current = null;
  loadedFor = null;
  records = {};
  dirty = new Set();
  retryMs = SAVE_AFTER_MS;
  flushing = null;
};
