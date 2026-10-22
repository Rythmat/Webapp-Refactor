import {
  TRACK_FIELDS,
  UNDO_KEYS,
  type UndoKey,
} from '@/daw/persistence/projectDocument/fields';
import { useStore, type AllSlices, type Track } from './index';
import { keyDerivedState } from './prismSlice';
import {
  currentOrigin,
  inTransaction,
  onTransactionEnd,
  runTransaction,
  withOrigin,
  type WriteOrigin,
} from './writeContext';

// ── The project's undo history ─────────────────────────────────────────────
//
// Undo records what an edit changed, not the whole project. Each entry holds
// the values the edit replaced and the values it left, for the store keys it
// touched, by reference: the store never mutates a value in place, so the old
// tracks array is the project's tracks as they were, at no cost. Nothing is
// serialised or cloned, so a drag step costs a few reference checks.
//
// What undo covers comes from the project registry (fields.ts): every store
// key with `undo` set, and of a track every field but the ones each person
// keeps for themself (mute, solo, arm, monitor, inputs). Undo leaves those as
// they are now.
//
// Writes carry an origin. Only the student's own edits ('user') are
// recorded. A project being opened or seeded ('seed'), the editor's own
// bookkeeping such as stamping an uploaded take ('system'), a collaborator's
// edit ('remote') and undo itself ('undo') are not, so Cmd+Z after opening a
// template keeps its tracks, and the first Cmd+Z after a recording undoes the
// recording rather than an invisible upload stamp (state-reload-21, -22).
//
// An edit made in withTransaction(label, fn) is one entry with that label:
// a gesture's commit (useContinuousControl), a Score edit's notes and marks.
// Writes outside a transaction still count: they gather into one entry until
// the edits have been still for 300 ms, which is how call sites not yet given
// a transaction behave as before.

export { currentOrigin, withOrigin };
export type HistoryOrigin = WriteOrigin;

type UndoValues = Partial<Pick<AllSlices, UndoKey>>;

/** The track fields undo covers; the rest stay as they are on undo. */
const TRACK_UNDO_FIELDS: readonly (keyof Track)[] = Object.freeze(
  (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
    (key) => TRACK_FIELDS[key].undo,
  ),
);
const TRACK_KEPT_FIELDS: readonly (keyof Track)[] = Object.freeze(
  (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
    (key) => !TRACK_FIELDS[key].undo,
  ),
);

export interface HistoryEntry {
  /** What the edit was, in words ('Change volume'). */
  label: string;
  /** The values the edit replaced, by store key. */
  before: UndoValues;
  /** The values it left. */
  after: UndoValues;
}

/** How many edits undo keeps. */
export const MAX_HISTORY = 100;
/** How long writes outside a transaction gather into one entry. */
export const IDLE_MS = 300;

const undoStack: HistoryEntry[] = [];
const redoStack: HistoryEntry[] = [];

// ── Letting the buttons know ────────────────────────────────────────────
// The stacks are plain arrays, so anything drawing an undo button has to be
// told when they change.

const listeners = new Set<() => void>();
let version = 0;

/** Tells the undo buttons (and collab undo's) that the stacks changed. */
export function notifyHistory(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Subscribe to undo/redo availability; returns the unsubscribe. */
export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever the stacks do, for `useSyncExternalStore`. */
export function historyVersion(): number {
  return version;
}

// ── Origins ────────────────────────────────────────────────────────────────

/**
 * Runs `fn` with its store writes left out of undo: opening or seeding a
 * project ('seed'), or the editor's own bookkeeping ('system'). An edit still
 * gathering is closed first, so it can't take these writes in.
 */
export function withoutHistory<T>(
  fn: () => T,
  as: Exclude<HistoryOrigin, 'user'> = 'system',
): T {
  if (!inTransaction()) closeOpen();
  return withOrigin(as, fn);
}

// ── Recording ─────────────────────────────────────────────────────────────

interface OpenEntry extends HistoryEntry {
  /** A transaction's entry, or writes gathering until they settle. */
  explicit: boolean;
}

let open: OpenEntry | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdle(): void {
  if (idleTimer === null) return;
  clearTimeout(idleTimer);
  idleTimer = null;
}

/** Whether two tracks arrays differ in anything undo covers. */
export function tracksDifferForUndo(
  a: readonly Track[],
  b: readonly Track[],
): boolean {
  if (a === b) return false;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    for (const field of TRACK_UNDO_FIELDS) {
      if (x[field] !== y[field]) return true;
    }
  }
  return false;
}

function differs(key: UndoKey, a: unknown, b: unknown): boolean {
  if (a === b) return false;
  if (key === 'tracks') {
    return tracksDifferForUndo(a as Track[], b as Track[]);
  }
  return true;
}

/**
 * Whether two store values hold the same data: plain objects and arrays
 * compared by content, a missing key the same as an undefined one. An entry
 * asks this once, when it closes, and only of values whose references
 * differ, so a drag pays nothing for it.
 */
function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return false;
  }
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return (
      a.length === other.length && a.every((v, i) => sameData(v, other[i]))
    );
  }
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  for (const key of Object.keys(x)) if (!sameData(x[key], y[key])) return false;
  for (const key of Object.keys(y))
    if (!(key in x) && y[key] !== undefined) {
      return false;
    }
  return true;
}

/**
 * Whether an entry changed `key` at all, by value: a write that put back
 * equal data (a panel re-saving what it opened with, a drag let go where it
 * began) is no step, as it was when undo compared JSON.
 */
function changedByValue(key: UndoKey, a: unknown, b: unknown): boolean {
  if (!differs(key, a, b)) return false;
  if (key !== 'tracks') return !sameData(a, b);
  const x = a as Track[];
  const y = b as Track[];
  if (x.length !== y.length) return true;
  return x.some(
    (track, i) =>
      track !== y[i] &&
      TRACK_UNDO_FIELDS.some((field) => !sameData(track[field], y[i][field])),
  );
}

let pushed = 0;
let dropped = 0;

/** How many entries have been recorded since the page loaded. */
export function historyPushCount(): number {
  return pushed;
}

/**
 * How many entries the history has let go of since the page loaded (past
 * the cap, a redo branch cut off, a reset): what they held may be garbage
 * now, such as a deleted take's audio (audio/assets/assetGc.ts).
 */
export function historyDropCount(): number {
  return dropped;
}

/** Puts an entry on the undo stack, dropping the oldest past the cap. */
function push(entry: HistoryEntry): void {
  pushed += 1;
  undoStack.push(entry);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
    dropped += 1;
  }
  dropped += redoStack.length;
  redoStack.length = 0;
  notifyHistory();
}

/** Ends the entry being gathered, keeping it if it changed anything. */
function closeOpen(): void {
  clearIdle();
  const entry = open;
  open = null;
  if (!entry) return;
  const keys = Object.keys(entry.after) as UndoKey[];
  for (const key of keys) {
    // A key that ended where it began, such as a drag let go at its start.
    if (!changedByValue(key, entry.before[key], entry.after[key])) {
      delete entry.before[key];
      delete entry.after[key];
    }
  }
  const changed = Object.keys(entry.after) as UndoKey[];
  if (changed.length === 0) return;
  push({
    label: entry.label || labelFor(changed),
    before: entry.before,
    after: entry.after,
  });
}

function record(state: AllSlices, prev: AllSlices): void {
  if (currentOrigin() !== 'user') {
    // A write undo doesn't record ends the edit gathering before it: what
    // the edit left is what this write found.
    if (!inTransaction() && open && !open.explicit) closeOpen();
    return;
  }
  const fresh = !open || Object.keys(open.after).length === 0;
  let touched = false;
  for (const key of UNDO_KEYS) {
    const was = prev[key];
    const now = state[key];
    if (!differs(key, was, now)) continue;
    open ??= { label: '', before: {}, after: {}, explicit: false };
    if (!(key in open.before)) {
      (open.before as Record<string, unknown>)[key] = was;
    }
    (open.after as Record<string, unknown>)[key] = now;
    touched = true;
  }
  if (!touched || !open) return;
  // The buttons can undo an edit as soon as it starts gathering.
  if (fresh) notifyHistory();
  if (open.explicit) return;
  clearIdle();
  idleTimer = setTimeout(closeOpen, IDLE_MS);
}

/**
 * Runs `fn` as one undo entry named `label`: every store write it makes
 * undoes together. A transaction inside another joins it. The writes keep
 * the origin they are made with, so a seed calling an action that opens a
 * transaction is still not recorded.
 */
export function withTransaction<T>(label: string, fn: () => T): T {
  if (!inTransaction()) {
    closeOpen();
    open = { label, before: {}, after: {}, explicit: true };
  }
  return runTransaction(label, fn);
}

// The outermost transaction's end closes its entry.
onTransactionEnd(() => {
  if (open?.explicit) closeOpen();
});

/** Ends the edit still gathering now, so undo sees it. */
export function flushHistory(): void {
  if (!inTransaction()) closeOpen();
}

// ── Undo and redo ─────────────────────────────────────────────────────────

/**
 * The values to restore, with what undo leaves alone put back: each track's
 * own fields (mute, solo, arm, monitor, inputs) as they are now, and the
 * state that follows from the key.
 */
function restorePatch(values: UndoValues): Partial<AllSlices> {
  const state = useStore.getState();
  const patch: Partial<AllSlices> = { ...values };
  if (values.tracks) {
    const current = new Map(state.tracks.map((t) => [t.id, t]));
    patch.tracks = values.tracks.map((track) => {
      const now = current.get(track.id);
      if (!now) return track;
      let kept: Track | null = null;
      for (const field of TRACK_KEPT_FIELDS) {
        if (track[field] === now[field]) continue;
        kept ??= { ...track };
        (kept as unknown as Record<string, unknown>)[field] = now[field];
      }
      return kept ?? track;
    });
  }
  if ('rootNote' in values || 'mode' in values) {
    Object.assign(
      patch,
      keyDerivedState({
        rootNote:
          values.rootNote !== undefined ? values.rootNote : state.rootNote,
        mode: values.mode ?? state.mode,
        stringSeq: state.stringSeq,
      }),
    );
  }
  return patch;
}

function apply(values: UndoValues): void {
  withOrigin('undo', () => useStore.setState(restorePatch(values)));
}

/** Undo: put back what the last edit replaced. */
export function undo(): boolean {
  flushHistory();
  const entry = undoStack.pop();
  if (!entry) return false;
  apply(entry.before);
  redoStack.push(entry);
  notifyHistory();
  return true;
}

/** Redo: make the last undone edit again. */
export function redo(): boolean {
  flushHistory();
  const entry = redoStack.pop();
  if (!entry) return false;
  apply(entry.after);
  undoStack.push(entry);
  notifyHistory();
  return true;
}

export function canUndo(): boolean {
  return undoStack.length > 0 || hasPendingEdit();
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

/** Whether an edit is still gathering (it becomes an entry on its own). */
function hasPendingEdit(): boolean {
  if (!open) return false;
  return (Object.keys(open.after) as UndoKey[]).some((key) =>
    differs(key, open!.before[key], open!.after[key]),
  );
}

/** What Undo would undo, in words; null when nothing. */
export function undoLabel(): string | null {
  if (hasPendingEdit()) {
    return open!.label || labelFor(Object.keys(open!.after) as UndoKey[]);
  }
  return undoStack.at(-1)?.label ?? null;
}

/** What Redo would redo, in words; null when nothing. */
export function redoLabel(): string | null {
  return redoStack.at(-1)?.label ?? null;
}

/** The labels of the undo stack, oldest first (for tests and a later list). */
export function historyLabels(): string[] {
  return undoStack.map((entry) => entry.label);
}

/**
 * Forget the history: when a different project loads, so undo can't bring
 * back the previous one.
 */
export function resetHistory(): void {
  clearIdle();
  open = null;
  dropped += undoStack.length + redoStack.length;
  undoStack.length = 0;
  redoStack.length = 0;
  notifyHistory();
}

/**
 * Every value the history holds for `key`, the edit still gathering
 * included, before and after each edit: what undo or redo could bring back,
 * such as the audio clips whose recordings must stay in memory
 * (audio/assets/assetGc.ts). Read only.
 */
export function historyValues<K extends UndoKey>(key: K): AllSlices[K][] {
  const values: AllSlices[K][] = [];
  const add = (entry: UndoValues) => {
    if (key in entry) values.push(entry[key] as AllSlices[K]);
  };
  for (const entry of [...undoStack, ...redoStack]) {
    add(entry.before);
    add(entry.after);
  }
  if (open) {
    add(open.before);
    add(open.after);
  }
  return values;
}

/**
 * Rewrites every value the history holds for `key` through `map`: for a
 * system write that must survive undo and redo, such as an uploaded take's
 * asset id, which would otherwise come undone with the edit that made the
 * take. `map` must leave a value it has nothing to do with unchanged.
 */
export function rewriteHistory<K extends UndoKey>(
  key: K,
  map: (value: AllSlices[K]) => AllSlices[K],
): void {
  const rewrite = (values: UndoValues) => {
    if (key in values) {
      (values as Record<string, unknown>)[key] = map(
        values[key] as AllSlices[K],
      );
    }
  };
  for (const entry of [...undoStack, ...redoStack]) {
    rewrite(entry.before);
    rewrite(entry.after);
  }
  if (open) {
    rewrite(open.before);
    rewrite(open.after);
  }
}

// ── Labels ─────────────────────────────────────────────────────────────────
// What an entry without a transaction's label is called, from the keys it
// changed: the first rule that matches.

const LABEL_RULES: ReadonlyArray<[label: string, keys: readonly UndoKey[]]> = [
  ['Change key', ['rootNote', 'mode']],
  ['Change tempo', ['bpm']],
  [
    'Change time signature',
    ['timeSignatureNumerator', 'timeSignatureDenominator'],
  ],
  ['Edit chords', ['chordRegions']],
  ['Edit markers', ['markers']],
  ['Edit sections', ['sections']],
  ['Change master volume', ['masterVolume']],
  ['Edit master effects', ['masteringFxChain', 'masteringEffects']],
  ['Edit returns', ['returns']],
  ['Edit automation', ['masterAutomation']],
  ['Change clip colors', ['clipColorMode']],
  ['Edit tracks', ['tracks']],
];

/** The undo keys an edit from `prev` to `next` changed. */
export function undoKeysChanged(prev: AllSlices, next: AllSlices): UndoKey[] {
  return UNDO_KEYS.filter((key) => differs(key, prev[key], next[key]));
}

/** What an edit that changed `keys` is called, without a label of its own. */
export function labelFor(keys: readonly UndoKey[]): string {
  for (const [label, ruleKeys] of LABEL_RULES) {
    if (ruleKeys.some((key) => keys.includes(key))) return label;
  }
  // Everything else undo covers is the Score and the Lead Sheet's.
  return 'Edit score';
}

// ── Tracking ──────────────────────────────────────────────────────────────

let paused = false;

/**
 * Stops recording, for as long as a shared session's own undo (the Yjs undo
 * manager) stands in for this one, and forgets the history either way: what
 * it holds belongs to before.
 */
export function setHistoryPaused(value: boolean): void {
  if (paused === value) return;
  paused = value;
  resetHistory();
}

export function isHistoryPaused(): boolean {
  return paused;
}

// One store listener however many editors mount (StrictMode mounts twice,
// and every return to the editor mounts again): each caller holds a claim,
// and the listener goes when the last claim is released.
let trackingClaims = 0;
let stopTracking: (() => void) | null = null;

/**
 * Start recording edits; returns the release for an effect cleanup. What
 * changed while nothing was recording (a project opened elsewhere) is never
 * an undo step, since only writes made from now on are seen.
 */
export function startHistory(): () => void {
  trackingClaims += 1;
  stopTracking ??= useStore.subscribe((state, prev) => {
    if (!paused) record(state, prev);
  });

  // An edit still gathering when the last claim goes is not dropped: its
  // timer runs on its own and records it.
  let released = false;
  return () => {
    if (released) return;
    released = true;
    trackingClaims -= 1;
    if (trackingClaims > 0 || !stopTracking) return;
    stopTracking();
    stopTracking = null;
  };
}
