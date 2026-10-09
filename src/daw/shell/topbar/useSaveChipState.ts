import { useSyncExternalStore } from 'react';
import {
  useCloudSaveStore,
  type LastSaved,
} from '@/daw/commands/cloudSaveStore';
import { groupsFromGaps } from '@/daw/commands/lastSaved';
import { useDraftStatusStore } from '@/daw/persistence/drafts/draftStatusStore';
import {
  cloudSaveGaps,
  documentFingerprint,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { isBusyPhase, useSessionStore } from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import { modShortcut } from './platformKeys';
import {
  deriveSaveChip,
  sameSaveChipView,
  type SaveChipInputs,
  type SaveChipView,
} from './saveChipModel';

// ── The save chip's state, kept outside React (milestone 1.4) ──────────────
//
// One module-scope controller, attached while any chip is mounted. It
// listens to the cloud save, the draft writer, the session, the document's
// version and the cloud link, derives the chip's view on every change, and
// tells React only when the view itself changes. documentVersion moves 20–60
// times a second during a drag; the chip re-renders only when its state
// flips (Stage A exit: no top-bar commits outside input).
//
// Whether the document still matches the last save is the one costly read
// (1.3's documentFingerprint, then hashFingerprint): it runs only while the
// live project is the one last saved and its version differs from the
// save's (or the save was incomplete, for the tooltip's groups), never
// sooner than FINGERPRINT_QUIET_MS after the last documentVersion move, and
// at most once per FINGERPRINT_QUIET_MS, in an idle callback, and never
// while the transport plays (it runs when playback stops). Undo back to what
// was saved reads 'Saved' again once it has run. An open's own version moves
// don't hold the check back: when the open reaches ready, the check runs at
// once, before the chip unfreezes, so a reopened saved draft reads 'Saved'
// straight away (no 'Saved on this device' flash, no extra announcement).

/** Quiet time after a documentVersion move, and the gap between checks. */
export const FINGERPRINT_QUIET_MS = 500;
/** How long audio bytes may sit in memory before the chip warns. */
export const AUDIO_GRACE_MS = 1000;

interface MatchRecord {
  version: number;
  saved: LastSaved;
  projectId: string;
  value: boolean;
  groups: string[] | null;
  /** The incomplete save left audio out (an upload that failed). */
  audio: boolean;
}

/** cloudSaveGaps names of audio a save couldn't upload. */
const AUDIO_GAP_KEYS: ReadonlySet<string> = new Set([
  'AudioClip.assetId',
  'Track.samplerSample',
]);

type IdleHandle = { cancel(): void };

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** Run `fn` when the main thread is idle (≤1 s); null without the API. */
function whenIdle(fn: () => void): IdleHandle | null {
  const w = globalThis as IdleGlobal;
  if (
    typeof w.requestIdleCallback !== 'function' ||
    typeof w.cancelIdleCallback !== 'function'
  ) {
    return null;
  }
  const handle = w.requestIdleCallback(fn, { timeout: 1000 });
  return { cancel: () => w.cancelIdleCallback!(handle) };
}

const listeners = new Set<() => void>();
let current: SaveChipView | null = null;
/** The last view handed out while detached, kept so React sees one object. */
let detachedView: SaveChipView | null = null;
let detachAll: (() => void) | null = null;

let match: MatchRecord | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let checkIdle: IdleHandle | null = null;
let lastCheckAt = Number.NEGATIVE_INFINITY;
let lastBumpAt = Number.NEGATIVE_INFINITY;
let pendingSince: number | null = null;
let audioTimer: ReturnType<typeof setTimeout> | null = null;
let saveShortcut = 'Ctrl+S';

/** The match record, if it still describes the live document and save. */
function liveMatch(
  version: number,
  saved: LastSaved | null,
  projectId: string | null,
): MatchRecord | null {
  if (
    match !== null &&
    saved !== null &&
    match.version === version &&
    match.saved === saved &&
    match.projectId === projectId
  ) {
    return match;
  }
  return null;
}

function readInputs(): SaveChipInputs {
  const cloud = useCloudSaveStore.getState();
  const draft = useDraftStatusStore.getState();
  const documentVersion = useSaveStatusStore.getState().documentVersion;
  const projectId = useStore.getState().projectId;
  const known = liveMatch(documentVersion, cloud.lastSaved, projectId);
  const inMemory = draft.media.pendingInMemory;
  const graceOver =
    pendingSince !== null && Date.now() - pendingSince >= AUDIO_GRACE_MS;
  return {
    opening: isBusyPhase(useSessionStore.getState().phase),
    cloud: {
      phase: cloud.phase,
      error: cloud.error,
      lastSaved: cloud.lastSaved,
    },
    draft: {
      draftId: draft.draftId,
      pendingSeq: draft.pendingSeq,
      committedSeq: draft.committedSeq,
      error: draft.error,
    },
    media: {
      pendingInMemory: graceOver ? inMemory : 0,
      missing: draft.media.missing,
    },
    projectId,
    documentVersion,
    matchesLastSaved: known?.value ?? null,
    gapGroups: known?.groups ?? null,
    audioNotUploaded: known?.audio ?? false,
    saveShortcut,
  };
}

/** Start or stop the one-second hold on in-memory audio. */
function trackAudioGrace(): void {
  const inMemory = useDraftStatusStore.getState().media.pendingInMemory;
  if (inMemory <= 0) {
    pendingSince = null;
    if (audioTimer !== null) clearTimeout(audioTimer);
    audioTimer = null;
    return;
  }
  if (pendingSince !== null) return;
  pendingSince = Date.now();
  audioTimer = setTimeout(() => {
    audioTimer = null;
    recompute();
  }, AUDIO_GRACE_MS);
}

/** Whether the fingerprint check has something to say right now. */
function checkWanted(): boolean {
  const saved = useCloudSaveStore.getState().lastSaved;
  const projectId = useStore.getState().projectId;
  if (saved === null || projectId === null || saved.projectId !== projectId) {
    return false;
  }
  const version = useSaveStatusStore.getState().documentVersion;
  if (version === saved.version && saved.complete) return false;
  return liveMatch(version, saved, projectId) === null;
}

function cancelCheck(): void {
  if (checkTimer !== null) clearTimeout(checkTimer);
  checkIdle?.cancel();
  checkTimer = null;
  checkIdle = null;
}

function scheduleCheck(): void {
  cancelCheck();
  if (!checkWanted()) return;
  // Not during playback (Chromebook audio); the stop schedules it again.
  if (useStore.getState().isPlaying) return;
  const now = Date.now();
  const delay = Math.max(
    0,
    lastBumpAt + FINGERPRINT_QUIET_MS - now,
    lastCheckAt + FINGERPRINT_QUIET_MS - now,
  );
  checkTimer = setTimeout(() => {
    checkTimer = null;
    checkIdle = whenIdle(() => {
      checkIdle = null;
      runCheck();
    });
    // No idle callbacks (Safari, tests): now.
    if (checkIdle === null) runCheck();
  }, delay);
}

function runCheck(): void {
  cancelCheck();
  if (detachAll === null || !checkWanted()) return;
  const saved = useCloudSaveStore.getState().lastSaved!;
  const projectId = useStore.getState().projectId!;
  const version = useSaveStatusStore.getState().documentVersion;
  lastCheckAt = Date.now();
  let value: boolean;
  let groups: string[] | null = null;
  let audio = false;
  try {
    value =
      version === saved.version ||
      hashFingerprint(documentFingerprint()) === saved.fingerprint;
    if (value && !saved.complete) {
      const gaps = cloudSaveGaps(useStore.getState(), 'legacy');
      groups = groupsFromGaps(gaps);
      audio = gaps.some((gap) => AUDIO_GAP_KEYS.has(gap));
    }
  } catch (err) {
    // Reading the document failed: say nothing is saved rather than 'Saved'.
    console.error('[save chip] fingerprint check failed:', err);
    value = false;
  }
  match = { version, saved, projectId, value, groups, audio };
  recompute();
}

function recompute(): void {
  if (detachAll === null) return;
  trackAudioGrace();
  const shown = current ?? detachedView;
  const next = deriveSaveChip(readInputs(), current);
  if (shown !== null && sameSaveChipView(next, shown)) {
    current = shown;
    return;
  }
  current = next;
  for (const listener of [...listeners]) listener();
}

function attach(): void {
  if (detachAll !== null) return;
  saveShortcut = modShortcut('s').label;
  const onChange = () => {
    recompute();
    scheduleCheck();
  };
  const unsubscribers = [
    useCloudSaveStore.subscribe(onChange),
    useDraftStatusStore.subscribe(onChange),
    useSessionStore.subscribe((state, prev) => {
      if (state.phase === prev.phase) return;
      if (isBusyPhase(prev.phase) && !isBusyPhase(state.phase)) {
        // Ready (or failed): check now, before the chip unfreezes, so it
        // doesn't pass through 'Saved on this device' on its way to 'Saved'.
        if (checkWanted()) runCheck();
      }
      onChange();
    }),
    useSaveStatusStore.subscribe((state, prev) => {
      if (state.documentVersion === prev.documentVersion) return;
      // An open's own load doesn't hold the check back.
      if (!isBusyPhase(useSessionStore.getState().phase)) {
        lastBumpAt = Date.now();
      }
      onChange();
    }),
    useStore.subscribe((state, prev) => {
      if (state.projectId !== prev.projectId) onChange();
      else if (state.isPlaying !== prev.isPlaying && !state.isPlaying) {
        scheduleCheck();
      }
    }),
  ];
  detachAll = () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
  current = null;
  recompute();
  scheduleCheck();
}

function detach(): void {
  detachAll?.();
  detachAll = null;
  cancelCheck();
  if (audioTimer !== null) clearTimeout(audioTimer);
  audioTimer = null;
  pendingSince = null;
  match = null;
  current = null;
  lastCheckAt = Number.NEGATIVE_INFINITY;
  lastBumpAt = Number.NEGATIVE_INFINITY;
}

/** Listen for chip view changes; attaches the controller on first use. */
export function subscribeSaveChip(listener: () => void): () => void {
  listeners.add(listener);
  attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) detach();
  };
}

/** The chip's view now (derived on demand when nothing is attached). */
export function getSaveChipView(): SaveChipView {
  if (detachAll !== null && current !== null) return current;
  // Not attached (the first render, before React subscribes): derive from
  // the stores as they stand, handing out the same object while it holds.
  const next = deriveSaveChip(readInputs());
  if (detachedView === null || !sameSaveChipView(detachedView, next)) {
    detachedView = next;
  }
  return detachedView;
}

/** The save chip's view, re-rendering only when it changes. */
export function useSaveChipState(): SaveChipView {
  return useSyncExternalStore(
    subscribeSaveChip,
    getSaveChipView,
    getSaveChipView,
  );
}
