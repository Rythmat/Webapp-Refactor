import {
  resetCloudSaveForSession,
  setLastSaved,
  useCloudSaveStore,
  whenSavesSettled,
} from '@/daw/commands/cloudSaveStore';
import { lastSavedFromDraft } from '@/daw/commands/lastSaved';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import {
  documentFingerprint,
  markDocumentBaseline,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  draftHasWork,
  draftIsCloudEqual,
} from '@/lib/studio-projects/drafts/predicates';
import type {
  DraftBaseline,
  DraftMeta,
} from '@/lib/studio-projects/drafts/types';
import { classifyStudioFailure } from '@/lib/studio-projects/studioApiError';
import {
  JOIN_TIMEOUT,
  BUSY_RECORDING,
  IN_ROOM_REFUSED,
  KEEP_REFUSED,
  onPanel,
  openError,
  openErrorFromFailure,
  roomOpenError,
  waitTimeoutError,
} from './openErrors';
import {
  intentLabel,
  needsToken,
  OpenRefusal,
  prepareIntent,
  waitingLabel,
  type PreparedOpen,
} from './intents';
import {
  editorBootCatalog,
  parseBootIntent,
  stripSearchKeys,
  validateIntent,
  type BootCatalog,
} from './parseBootIntent';
import {
  getSessionDeps,
  notifySessionDepsChanged,
  onSessionDepsChanged,
  type SessionDeps,
} from './sessionDeps';
import { getSessionGeneration } from './sessionGeneration';
import {
  announceBootNotices,
  announceFork,
  announceKept,
  announceLegacyKeptNotice,
  announceRoomGone,
  noticeUnsavedElsewhere,
  setNoticeOpener,
  showOpenError,
} from './sessionNotices';
import {
  isBusyPhase,
  useSessionStore,
  type SessionState,
} from './sessionStore';
import { takesInFlight, whenTakesSettled } from './takesInFlight';
import type {
  BootNotice,
  DraftClaim,
  OpenError,
  OpenIntent,
  OpenOptions,
  OpenOutcome,
  OpenPhase,
  PreparedDraft,
  SessionUser,
  WaitingFor,
} from './types';

// ── openSession: one way to open every Studio session (milestone 1.4) ──────
//
// Every path that puts a session in the editor comes through here: the boot
// links, a cold resume, a return to the editor, a rejoin, kept-work Restore,
// File ▸ New and Open, a Library template, a toolbar Join, leaving a room,
// the Song page (by URL). One machine, in phases:
//
//   waiting     the owner, then the sign-in token (project, collab, rejoin)
//               or the plan (a Premium lesson); 15 s, then the panel
//   validating  synchronous checks: the catalog, the Premium gate (outcome
//               'upgrade'), a link while in a room (refused)
//   preparing   every fetch or build, abortable; the draft it writes to is
//               claimed and, for a reopen, read (intents.ts)
//   keeping     a take in progress is stopped and committed, saves in flight
//               finish, the outgoing draft is flushed and kept (or dropped
//               when it holds no work)
//   switching   synchronous: leave the room, reset, clear undo, forget the
//               last save, activate the new draft
//   loading     synchronous apply; a collab joiner waits for the room's
//               first sync (25 s)
//   baselining  the document as it opened is the baseline, undo cleared, the
//               cloud record set, the draft begun
//   ready       overlay off, the URL's consumed keys stripped, the toasts
//
// Nothing changes before keeping: an open refused, cancelled or superseded
// there leaves the session, the URL's other keys, the drafts and the room
// exactly as they were. A failure after the switch leaves the room, resets,
// and reopens the work it kept (or an empty project), under the error panel.
//
// One open runs its keeping-to-ready section at a time. A newer open aborts
// an older one still waiting, validating or preparing; queues behind one
// keeping through baselining; and ends a collab load (the older open leaves
// the room and resolves 'superseded'). openSession reaches drafts, collab,
// auth and navigation only through SessionDeps (sessionDeps.ts), so tests
// drive it with fakes.
//
// The editor counts as gone only once no deps are registered (DawApp
// unmounted), or after an unmount and a later mount: a registration that
// replaces another one in place (an effect re-run, HMR, StrictMode) is the
// same editor, and every port call goes through the deps registered now.

const WAIT_TIMEOUT_MS = 15_000;
const WAIT_POLL_MS = 250;
const COLLAB_LOAD_TIMEOUT_MS = 25_000;
const OVERLAY_DELAY_MS = 250;
const CANCEL_AFTER_MS = 3_000;
const TAKE_WAIT_MS = 10_000;
const SAVE_WAIT_MS = 10_000;
/** Time for the recorders' effects to see a stop before the take wait. */
const TAKE_STOP_GRACE_MS = 50;

const EARLY_PHASES: ReadonlySet<OpenPhase> = new Set<OpenPhase>([
  'waiting',
  'validating',
  'preparing',
]);

type AbortReason = 'superseded' | 'cancelled' | 'deps-gone';
type CollabAbortReason = 'superseded' | 'back';

interface Run {
  readonly id: number;
  intent: OpenIntent;
  readonly requested: OpenIntent;
  readonly opts: OpenOptions;
  readonly controller: AbortController;
  /** The editor mount this open started in (depsEpoch). */
  readonly epoch: number;
  phase: OpenPhase;
  /** Aborts a collab load (a newer open, or 'Back to my work'). */
  collabWait: AbortController | null;
  readonly timers: ReturnType<typeof setTimeout>[];
  waitingFor: WaitingFor;
}

let nextRunId = 0;
/** The open asked for last: the one that owns the overlay once it runs. */
let latest: Run | null = null;
/** The open in its keeping-to-ready section. */
let lateHolder: Run | null = null;
let lateIdle: Promise<void> = Promise.resolve();
/** A session has been opened in this page (the first cold boot dims). */
let pageOpened = false;
/** Kept work a superseded collab load never got to announce. */
let carriedKept: DraftMeta | null = null;
/** Links superseded before they finished: their keys go at the next end. */
const supersededLinks: OpenIntent[] = [];
let catalogOverride: BootCatalog | null = null;

// ── Whether the editor that asked is still there ───────────────────────────
//
// Bumped once the deps have stayed unregistered for a tick: an unmount. A
// re-registration in place (cleanup then setup in one commit) never bumps it.
let depsEpoch = 0;
let goneTimer: ReturnType<typeof setTimeout> | null = null;
let goneMarked = false;

onSessionDepsChanged(() => {
  if (getSessionDeps() !== null) {
    goneMarked = false;
    if (goneTimer !== null) {
      clearTimeout(goneTimer);
      goneTimer = null;
    }
    return;
  }
  if (goneMarked || goneTimer !== null) return;
  goneTimer = setTimeout(() => {
    goneTimer = null;
    if (getSessionDeps() !== null || goneMarked) return;
    goneMarked = true;
    depsEpoch += 1;
    // Wakes a waiting open, which then sees the editor gone.
    notifySessionDepsChanged();
  }, 0);
});

/** The editor `run` opened for has unmounted (or was mounted again since). */
function editorGone(run: Run): boolean {
  return getSessionDeps() === null || run.epoch !== depsEpoch;
}

/** `pick()`'s object, read afresh on every property access. */
function forward<T extends object>(pick: () => T): T {
  return new Proxy({} as T, {
    get(_target, key) {
      const target = pick();
      const value: unknown = Reflect.get(target, key);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

/**
 * The deps an open calls through: the ones registered now, else (the editor
 * gone) the ones it started with, so a claim is still released and a room
 * still left after an unmount.
 */
function liveDeps(captured: SessionDeps): SessionDeps {
  const current = () => getSessionDeps() ?? captured;
  return {
    user: () => current().user(),
    token: () => current().token(),
    lessonAccess: (tutorialId) => current().lessonAccess(tutorialId),
    collab: forward(() => current().collab),
    drafts: forward(() => current().drafts),
    navigate: (search, opts) => current().navigate(search, opts),
    openProjectsDialog: (opts) => current().openProjectsDialog(opts),
  };
}

/** Test seam: the catalog validateIntent checks against. */
export function setBootCatalogForTests(catalog: BootCatalog | null): void {
  catalogOverride = catalog;
}

/** Test seam: forget this page's opens (between tests). */
export function resetOpenSessionForTests(): void {
  latest?.controller.abort('cancelled');
  latest = null;
  lateHolder = null;
  lateIdle = Promise.resolve();
  pageOpened = false;
  carriedKept = null;
  supersededLinks.length = 0;
  catalogOverride = null;
}

class Aborted extends Error {
  constructor(readonly reason: AbortReason) {
    super(`open ${reason}`);
    this.name = 'AbortError';
  }
}

class WaitTimeout extends Error {
  constructor(readonly waitingFor: 'owner' | 'token' | 'plan') {
    super(`waited too long for ${waitingFor}`);
  }
}

const abortReasonOf = (run: Run): AbortReason => {
  const reason: unknown = run.controller.signal.reason;
  return reason === 'superseded' || reason === 'deps-gone'
    ? reason
    : 'cancelled';
};

const isAborted = (run: Run, err: unknown): boolean =>
  err instanceof Aborted || run.controller.signal.aborted;

// ── The session store ──────────────────────────────────────────────────────

/** Whether `run` may write the overlay's state now. */
function owns(run: Run): boolean {
  return lateHolder === null ? latest === run : lateHolder === run;
}

function write(run: Run, partial: Partial<SessionState>): void {
  if (owns(run)) useSessionStore.setState(partial);
}

function setPhase(run: Run, phase: OpenPhase, label?: string | null): void {
  run.phase = phase;
  write(run, {
    phase,
    ...(label !== undefined ? { label } : {}),
    ...(EARLY_PHASES.has(phase) ? {} : { cancellable: false }),
  });
}

function setWaiting(run: Run, waitingFor: WaitingFor, label?: string): void {
  run.waitingFor = waitingFor;
  write(run, {
    waitingFor,
    label: waitingLabel(waitingFor) ?? label ?? intentLabel(run.intent),
  });
}

/** The overlay: a dim at once on the first cold boot, full after 250 ms. */
function startOverlay(run: Run): void {
  write(run, {
    phase: run.phase,
    intent: run.intent,
    source: run.opts.source,
    label: intentLabel(run.intent),
    waitingFor: null,
    startedAt: Date.now(),
    overlay: pageOpened ? 'none' : 'dim',
    cancellable: false,
    error: null,
    retryIntent: null,
  });
  run.timers.push(
    setTimeout(() => {
      if (isBusyPhase(run.phase)) write(run, { overlay: 'full' });
    }, OVERLAY_DELAY_MS),
    setTimeout(() => {
      // A resume is what a cancelled open falls back to: never cancelled.
      if (EARLY_PHASES.has(run.phase) && run.requested.kind !== 'resume') {
        write(run, { cancellable: true });
      }
    }, CANCEL_AFTER_MS),
  );
}

function clearTimers(run: Run): void {
  for (const timer of run.timers) clearTimeout(timer);
  run.timers.length = 0;
}

/** The phase the store rests in when an open ends without a switch. */
const restingPhase = (): OpenPhase =>
  useSessionStore.getState().draftId !== null ? 'ready' : 'idle';

// ── Waiting ────────────────────────────────────────────────────────────────

/**
 * Wait until `read` gives a value (re-asked on every deps change and every
 * 250 ms), or the 15 s limit (WaitTimeout), or an abort, or the editor goes.
 */
function waitFor<T>(
  run: Run,
  waitingFor: 'owner' | 'token' | 'plan',
  read: () => T | null,
): Promise<T> {
  const ready = (): T | null => {
    if (run.epoch !== depsEpoch) throw new Aborted('deps-gone');
    // Unregistered for now: a re-registration in place, or an unmount the
    // epoch says so of a tick later.
    if (getSessionDeps() === null) return null;
    return read();
  };
  const now = ready();
  if (now !== null) return Promise.resolve(now);
  setWaiting(run, waitingFor);
  return new Promise<T>((resolve, reject) => {
    const signal = run.controller.signal;
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      clearInterval(poll);
      unsubscribe();
      signal.removeEventListener('abort', onAbort);
      if (run.waitingFor === waitingFor) setWaiting(run, null);
      settle();
    };
    const check = () => {
      try {
        const value = ready();
        if (value !== null) finish(() => resolve(value));
      } catch (err) {
        finish(() => reject(err));
      }
    };
    const onAbort = () => finish(() => reject(new Aborted(abortReasonOf(run))));
    const timer = setTimeout(
      () => finish(() => reject(new WaitTimeout(waitingFor))),
      WAIT_TIMEOUT_MS,
    );
    const poll = setInterval(check, WAIT_POLL_MS);
    const unsubscribe = onSessionDepsChanged(check);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves with `promise`, or rejects with Aborted once the run aborts. */
function untilAborted<T>(run: Run, promise: Promise<T>): Promise<T> {
  const signal = run.controller.signal;
  if (signal.aborted) return Promise.reject(new Aborted(abortReasonOf(run)));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Aborted(abortReasonOf(run)));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

type RoomWait =
  | { status: 'joined' }
  | { status: 'failed'; error: OpenError }
  | { status: 'aborted'; reason: CollabAbortReason };

/**
 * A joiner's load: connected to `roomId`, plus one macrotask (the pull from
 * the room runs right after the status write). Fails when the provider
 * clears the room (its roomError says why), or after 25 s.
 */
function waitForRoom(run: Run, roomId: string): Promise<RoomWait> {
  const controller = new AbortController();
  run.collabWait = controller;
  return new Promise<RoomWait>((resolve) => {
    let settled = false;
    const finish = (result: () => RoomWait, later: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      controller.signal.removeEventListener('abort', onAbort);
      if (later) setTimeout(() => resolve(result()), 0);
      else resolve(result());
    };
    const check = () => {
      const s = useStore.getState();
      if (s.connectionStatus === 'connected' && s.roomId === roomId) {
        finish(() => ({ status: 'joined' }), true);
      } else if (s.roomId === null) {
        // The provider clears the room, then sets roomError: read it after.
        finish(
          () => ({
            status: 'failed',
            error: roomOpenError(useStore.getState().roomError),
          }),
          true,
        );
      }
    };
    const onAbort = () => {
      const reason: unknown = controller.signal.reason;
      finish(
        () => ({
          status: 'aborted',
          reason: reason === 'back' ? 'back' : 'superseded',
        }),
        false,
      );
    };
    const timer = setTimeout(
      () => finish(() => ({ status: 'failed', error: JOIN_TIMEOUT }), false),
      COLLAB_LOAD_TIMEOUT_MS,
    );
    const unsubscribe = useStore.subscribe(check);
    controller.signal.addEventListener('abort', onAbort, { once: true });
    check();
  }).finally(() => {
    run.collabWait = null;
  });
}

// ── URL ────────────────────────────────────────────────────────────────────

const isUrlOpen = (run: Run) =>
  run.opts.source === 'boot' || run.opts.source === 'link';

/**
 * Strip the keys a link's open consumed (every terminal outcome but
 * 'superseded'), while the address still asks for it: MSP keys, utm_* and
 * anything else stay. For an open a URL asked for, and, at any open's end,
 * for a link a newer open superseded (so a refresh can't open it again).
 */
function stripConsumedKeys(run: Run): void {
  const deps = getSessionDeps();
  if (!deps || editorGone(run) || typeof window === 'undefined') return;
  const search = window.location.search;
  const parsed = parseBootIntent(new URLSearchParams(search));
  if (parsed.consumedKeys.length === 0) {
    supersededLinks.length = 0;
    return;
  }
  const asked = JSON.stringify(parsed.intent);
  const own = isUrlOpen(run) && asked === JSON.stringify(run.requested);
  const left = supersededLinks.some((i) => JSON.stringify(i) === asked);
  if (!own && !left) return;
  supersededLinks.length = 0;
  deps.navigate(stripSearchKeys(search, parsed.consumedKeys), {
    replace: true,
  });
}

/** A link superseded before its end: its keys go when the next open ends. */
function rememberSupersededLink(run: Run): void {
  if (isUrlOpen(run)) supersededLinks.push(run.requested);
}

/** Kept work only its own owner is told about (a shared device). */
function announceKeptFor(
  user: SessionUser | null,
  kept: DraftMeta | null,
  restorable: boolean,
): void {
  if (!kept || !user || kept.userKey !== user.userKey) return;
  announceKept(kept, { restorable });
}

/** The kept work a superseded collab load left to announce, if any. */
function announceCarriedKept(run: Run): void {
  const carried = carriedKept;
  if (!carried || editorGone(run)) return;
  carriedKept = null;
  announceKeptFor(
    getSessionDeps()?.user() ?? null,
    carried,
    useStore.getState().roomId === null,
  );
}

/**
 * Whether `intent` will replace the session (so it may end a collab load
 * still waiting): not a resume or rejoin, valid, not a Premium lesson this
 * student can't open, not a link for the room being joined.
 */
function replacesSession(intent: OpenIntent): boolean {
  if (intent.kind === 'resume' || intent.kind === 'rejoin') return false;
  if (validateIntent(intent, catalogOverride ?? editorBootCatalog())) {
    return false;
  }
  if (
    intent.kind === 'tutorial' &&
    getSessionDeps()?.lessonAccess(intent.tutorialId) === 'upgrade'
  ) {
    return false;
  }
  return !(
    intent.kind === 'collab' &&
    intent.code !== 'new' &&
    intent.code.trim().toLowerCase() === useStore.getState().roomId
  );
}

// ── The machine ────────────────────────────────────────────────────────────

/**
 * Open `intent` as the editor's session. Never throws: every way it ends is
 * an OpenOutcome, and useSessionStore says where it stands.
 */
export function openSession(
  intent: OpenIntent,
  opts: OpenOptions,
): Promise<OpenOutcome> {
  const run: Run = {
    id: ++nextRunId,
    intent,
    requested: intent,
    opts,
    controller: new AbortController(),
    epoch: depsEpoch,
    phase: 'waiting',
    collabWait: null,
    timers: [],
    waitingFor: null,
  };
  if (opts.signal) {
    const external = opts.signal;
    if (external.aborted) run.controller.abort('cancelled');
    else {
      external.addEventListener(
        'abort',
        () => {
          if (EARLY_PHASES.has(run.phase)) run.controller.abort('cancelled');
        },
        { once: true },
      );
    }
  }

  // A newer open aborts an older one still before keeping, and ends a
  // collab load when it will replace the session (a refused or no-op open
  // must not drop the room); it queues behind one keeping through
  // baselining.
  const previous = latest;
  latest = run;
  if (previous && EARLY_PHASES.has(previous.phase)) {
    previous.controller.abort('superseded');
  }
  if (lateHolder?.collabWait && replacesSession(intent)) {
    lateHolder.collabWait.abort('superseded');
  }

  return execute(run)
    .catch((err: unknown): OpenOutcome => {
      console.error('[open] unexpected failure', err);
      // A cold page left without a session gets the panel (Back resumes).
      const stranded = useSessionStore.getState().draftId === null;
      const error = openError('unknown', 'That could not be opened.', {
        cause: err,
        surface: stranded ? 'panel' : 'toast',
        retryable: stranded,
      });
      if (owns(run)) {
        useSessionStore.setState({
          phase: restingPhase(),
          overlay: 'none',
          cancellable: false,
          waitingFor: null,
          label: null,
          ...(stranded
            ? { error, retryIntent: { kind: 'resume' } as OpenIntent }
            : {}),
        });
      }
      if (!stranded) showOpenError(error);
      return { status: 'refused', error };
    })
    .finally(() => {
      clearTimers(run);
      if (latest === run) latest = null;
    });
}

async function execute(run: Run): Promise<OpenOutcome> {
  // Behind the open in its keeping-to-ready section, if any.
  try {
    await untilAborted(run, lateIdle);
  } catch {
    return endEarly(run, null, null, { status: abortedStatus(run) });
  }

  const captured = getSessionDeps();
  if (!captured || editorGone(run)) {
    return endEarly(run, null, null, { status: 'cancelled' });
  }
  const deps = liveDeps(captured);
  const cold = useSessionStore.getState().draftId === null;

  // A return to the editor carries on with the session it holds: nothing to
  // keep, reset or load. A room left behind is rejoined when it is the live
  // session's, or forgotten. Another user signed in on this page resumes
  // their own work instead (the live session is kept under its owner).
  const signedIn = deps.user();
  const liveOwner = useSessionStore.getState().userKey;
  const sameUser =
    signedIn === null || liveOwner === null || signedIn.userKey === liveOwner;
  if (run.intent.kind === 'resume' && !cold && sameUser) {
    const rejoin = rejoinFor(deps);
    if (!rejoin) return liveReady(run);
    run.intent = rejoin;
  }
  if (run.intent.kind === 'rejoin') return executeRejoin(run, deps);

  startOverlay(run);
  let user: SessionUser;
  try {
    user = await waitFor(run, 'owner', () => deps.user());
    if (needsToken(run.intent)) {
      await waitFor(run, 'token', () => deps.token());
    }
    const intent = run.intent;
    if (intent.kind === 'tutorial') {
      await waitFor(run, 'plan', () =>
        deps.lessonAccess(intent.tutorialId) === 'wait' ? null : true,
      );
    }
  } catch (err) {
    if (err instanceof WaitTimeout) {
      return refuse(run, cold, waitTimeoutError(err.waitingFor), {
        resumeAfter: err.waitingFor !== 'owner',
      });
    }
    return endEarly(run, null, cold, { status: abortedStatus(run) });
  }

  // ── validating ──
  setPhase(run, 'validating');
  const intent = run.intent;
  const invalid = validateIntent(
    intent,
    catalogOverride ?? editorBootCatalog(),
  );
  if (invalid) return refuse(run, cold, invalid);
  if (
    intent.kind === 'tutorial' &&
    deps.lessonAccess(intent.tutorialId) === 'upgrade'
  ) {
    useSessionStore.setState({ upgradeLessonId: intent.tutorialId });
    return endEarly(run, null, cold, {
      status: 'upgrade',
      lessonId: intent.tutorialId,
    });
  }
  // Membership is roomId (E15): a live room, or the live session's own room
  // while it reconnects. A room identity that is neither is stale, and this
  // open's switch clears it.
  const room = useStore.getState();
  const inRoom =
    room.roomId !== null &&
    (room.connectionStatus !== 'disconnected' ||
      useSessionStore.getState().roomId === room.roomId);
  if (
    inRoom &&
    run.opts.source !== 'leave-collab' &&
    intent.kind !== 'resume'
  ) {
    // A link for the room this tab is in already: carry on in it.
    if (
      intent.kind === 'collab' &&
      intent.code !== 'new' &&
      intent.code.trim().toLowerCase() === room.roomId
    ) {
      return liveReady(run);
    }
    return refuse(
      run,
      cold,
      openError('in-room', IN_ROOM_REFUSED, { surface: 'toast' }),
    );
  }
  if (
    intent.kind === 'draft' &&
    !cold &&
    intent.draftId === useSessionStore.getState().draftId
  ) {
    return liveReady(run);
  }

  // ── preparing ──
  setPhase(run, 'preparing', intentLabel(intent));
  const notices: BootNotice[] = [];
  let prepared: PreparedOpen;
  try {
    const result = await untilAborted(
      run,
      prepareIntent(intent, {
        deps,
        user,
        signal: run.controller.signal,
        cold,
        liveDraftId: useSessionStore.getState().draftId,
        notices,
        source: run.opts.source,
      }),
    );
    if ('noop' in result) return liveReady(run);
    prepared = result;
  } catch (err) {
    if (isAborted(run, err)) {
      return endEarly(run, null, cold, { status: abortedStatus(run) });
    }
    if (err instanceof OpenRefusal) return refuse(run, cold, err.error);
    console.error('[open] preparing failed', err);
    return refuse(
      run,
      cold,
      // A stalled store or build: the panel, with Retry.
      classifyStudioFailure(err) === 'timeout'
        ? openErrorFromFailure(err, 'session')
        : openError('unknown', 'That could not be opened.', {
            cause: err,
            surface: 'toast',
            retryable: false,
          }),
    );
  }
  if (run.controller.signal.aborted || editorGone(run)) {
    if (editorGone(run)) run.controller.abort('deps-gone');
    return endEarly(run, { deps, claim: prepared.claim }, cold, {
      status: abortedStatus(run),
    });
  }
  if (prepared.name) write(run, { label: intentLabel(intent, prepared.name) });

  // ── keeping through ready: one open at a time ──
  // Another user signed in on this page: their notices, never the previous
  // user's kept work.
  const userChanged = liveOwner !== null && liveOwner !== user.userKey;
  let releaseLate!: () => void;
  lateIdle = new Promise<void>((resolve) => {
    releaseLate = resolve;
  });
  lateHolder = run;
  try {
    return await executeLate(
      run,
      deps,
      user,
      cold,
      userChanged,
      prepared,
      notices,
    );
  } finally {
    if (lateHolder === run) lateHolder = null;
    releaseLate();
  }
}

const abortedStatus = (run: Run): 'superseded' | 'cancelled' =>
  abortReasonOf(run) === 'superseded' ? 'superseded' : 'cancelled';

async function executeLate(
  run: Run,
  deps: SessionDeps,
  user: SessionUser,
  cold: boolean,
  userChanged: boolean,
  prepared: PreparedOpen,
  notices: BootNotice[],
): Promise<OpenOutcome> {
  const intent = run.intent;
  const claim = prepared.claim;
  const keep = run.opts.keep ?? 'auto';
  const joinsRoom = intent.kind === 'collab' || prepared.collabWait !== null;

  // ── keeping ──
  setPhase(run, 'keeping');
  const transport = useStore.getState();
  if (transport.isRecording || transport.isCountingIn || takesInFlight() > 0) {
    setWaiting(run, 'take');
    if (transport.isRecording || transport.isCountingIn) transport.stop();
    // The recorders commit from their effects, a render after the stop.
    await delay(TAKE_STOP_GRACE_MS);
    if (!(await whenTakesSettled(TAKE_WAIT_MS))) {
      setWaiting(run, null);
      return refuse(
        run,
        cold,
        openError('busy', BUSY_RECORDING, { surface: 'toast' }),
        { release: { deps, claim } },
      );
    }
  }
  if (useCloudSaveStore.getState().inFlight > 0) {
    setWaiting(run, 'save');
    // A save that finishes later routes its result to the outgoing draft.
    await whenSavesSettled(SAVE_WAIT_MS);
  }
  setWaiting(run, null);

  // An editor gone before anything was set aside can't host a room join:
  // nothing has changed yet, so the open just ends.
  if (joinsRoom && editorGone(run)) {
    return endEarly(run, { deps, claim }, cold, { status: 'cancelled' });
  }

  const live = useSessionStore.getState().draftId !== null;
  let kept: DraftMeta | null = null;
  if (live) {
    let flushed: DraftMeta | null = null;
    try {
      flushed = await deps.drafts.flushOutgoing(`open:${intent.kind}`);
    } catch (err) {
      if (keep !== 'discard') {
        console.warn('[open] the outgoing work could not be kept', err);
        return refuse(
          run,
          cold,
          openError('storage', KEEP_REFUSED, { cause: err, surface: 'toast' }),
          { release: { deps, claim } },
        );
      }
    }
    try {
      kept = await deps.drafts.retireOutgoing(keep);
    } catch (err) {
      // The flush made the work durable. The port left the draft live (its
      // writes resumed); activate lets it go below. Go on: the flushed
      // draft (still a session draft) is the kept work.
      console.warn('[open] the outgoing draft could not be marked kept', err);
      kept =
        keep !== 'discard' && flushed && draftHasWork(flushed) ? flushed : null;
    }
  }
  if (prepared.claimDevice) {
    try {
      await deps.drafts.claimDeviceDraft(user, claim.draftId);
    } catch (err) {
      console.warn('[open] could not move the draft to this user', err);
    }
  }

  // ── switching (synchronous) ──
  setPhase(run, 'switching');
  // Leave the room BEFORE the reset: the empty project must never reach the
  // room's shared document.
  if (useStore.getState().roomId !== null) deps.collab.leaveRoom();
  resetProjectState(`open:${intent.kind}`);
  resetUndoHistory();
  resetCloudSaveForSession();
  deps.drafts.activate(claim);
  useSessionStore.setState({
    draftId: claim.draftId,
    userKey: claim.userKey,
    roomId: null,
  });

  // An editor gone mid-keep can't host a room join: the work it kept comes
  // back (or an empty project), so the next mount resumes a live draft.
  if (joinsRoom && editorGone(run)) {
    return failAfterSwitch(run, deps, user, claim, kept, null);
  }

  // ── loading ──
  setPhase(run, 'loading');
  try {
    prepared.apply({ collab: deps.collab, drafts: deps.drafts });
  } catch (err) {
    console.error('[open] the session could not be applied', err);
    return failAfterSwitch(
      run,
      deps,
      user,
      claim,
      kept,
      openError('unknown', 'That could not be opened.', {
        cause: err,
        surface: 'panel',
        retryable: true,
      }),
    );
  }
  if (prepared.collabWait) {
    if (prepared.collabWait.awaitHost) setWaiting(run, 'host');
    const result = await waitForRoom(run, prepared.collabWait.roomId);
    setWaiting(run, null);
    if (result.status === 'aborted') {
      if (result.reason === 'back') {
        const back = await failAfterSwitch(run, deps, user, claim, kept, null);
        return back.status === 'failed' ? { status: 'cancelled' } : back;
      }
      return supersededLoad(run, deps, kept);
    }
    if (result.status === 'failed') {
      return failAfterSwitch(run, deps, user, claim, kept, result.error);
    }
  }

  // ── baselining ──
  setPhase(run, 'baselining');
  markDocumentBaseline({ savedComplete: prepared.savedComplete });
  // Also cancels the undo captures the apply queued.
  resetUndoHistory();
  const generation = getSessionGeneration();
  const roomId = useStore.getState().roomId;
  let begun: DraftMeta | null = null;
  try {
    begun = await deps.drafts.begin(
      baselineFor(prepared.baseline, prepared.draft, claim),
      roomId !== null ? { roomId } : undefined,
    );
  } catch (err) {
    // The session is open; the draft status shows the storage error.
    console.error('[open] the draft could not be started', err);
  }
  // After begin: the draft's record exists, so the autosave stores the
  // cloud record it hears of on the draft (E11 compares it later).
  if (getSessionGeneration() === generation) {
    const record = prepared.lastSaved();
    if (record) setLastSaved(record);
  }

  // ── ready ──
  pageOpened = true;
  const forked = claim.mode === 'fork';
  const outcome: OpenOutcome = {
    status: 'ready',
    draftId: claim.draftId,
    kept,
    forked,
    generation,
  };
  run.phase = 'ready';
  write(run, {
    phase: 'ready',
    overlay: 'none',
    label: null,
    waitingFor: null,
    cancellable: false,
    error: null,
    retryIntent: null,
    lastOutcome: outcome,
    generation,
    roomId,
  });
  clearTimers(run);
  const stillCurrent = () => getSessionGeneration() === generation;
  if (prepared.draft) {
    void deps.drafts
      .restoreMedia(prepared.draft.meta, generation)
      .catch((err: unknown) =>
        console.warn('[open] the draft media could not be restored', err),
      );
  }
  if (editorGone(run)) {
    // The editor closed while this opened: no URL, toasts or extras.
    return outcome;
  }
  stripConsumedKeys(run);
  const restorable = roomId === null;
  const earlier = carriedKept;
  carriedKept = null;
  if (earlier && earlier.draftId !== kept?.draftId) {
    announceKeptFor(user, earlier, restorable);
  }
  announceKeptFor(user, kept, restorable);
  if (forked) announceFork();
  if (cold || userChanged) {
    announceBootNotices(user.userKey, notices);
    if (cold && intent.kind === 'resume') announceLegacyKeptNotice();
  }
  try {
    prepared.afterReady({
      deps,
      generation,
      stillCurrent,
      draftWritten: begun !== null,
    });
  } catch (err) {
    console.warn('[open] a step after opening failed', err);
  }
  if (
    (cold || userChanged) &&
    intent.kind !== 'resume' &&
    intent.kind !== 'draft'
  ) {
    const exclude = new Set<string>([claim.draftId]);
    if (kept) exclude.add(kept.draftId);
    void noticeUnsavedElsewhere(user, { exclude, stillCurrent });
  }
  return outcome;
}

/** The new draft's baseline: the stored one for a reopen, a pristine one for a fork. */
function baselineFor(
  baseline: PreparedOpen['baseline'],
  draft: PreparedDraft | null,
  claim: DraftClaim,
): DraftBaseline {
  const fingerprint = hashFingerprint(documentFingerprint());
  if (baseline !== 'stored') return { ...baseline, fingerprint };
  const stored = draft?.meta.baseline;
  if (claim.mode === 'fork' || !stored) {
    // An unedited copy is a cache of its source, still open elsewhere.
    return {
      source: stored?.source ?? 'empty',
      ...(stored?.ref !== undefined ? { ref: stored.ref } : {}),
      reopenable: true,
      fingerprint,
    };
  }
  return stored;
}

/**
 * A newer open ended this collab load: leave the room, leave an empty
 * project on the claimed draft (the newer open replaces it), and hand the
 * work this open kept to the next open to announce.
 */
async function supersededLoad(
  run: Run,
  deps: SessionDeps,
  kept: DraftMeta | null,
): Promise<OpenOutcome> {
  if (useStore.getState().roomId !== null) deps.collab.leaveRoom();
  resetProjectState('open:superseded');
  resetUndoHistory();
  resetCloudSaveForSession();
  markDocumentBaseline({ savedComplete: true });
  try {
    await deps.drafts.begin({
      source: 'empty',
      reopenable: true,
      fingerprint: hashFingerprint(documentFingerprint()),
    });
  } catch (err) {
    console.warn('[open] could not start the empty draft', err);
  }
  if (kept) carriedKept = kept;
  rememberSupersededLink(run);
  run.phase = 'idle';
  return { status: 'superseded' };
}

/** The panel when nothing could be reopened on this device. */
const NOTHING_REOPENED = openError(
  'storage',
  'Your work couldn’t be reopened on this device. Try again.',
  { surface: 'panel', retryable: true },
);

/**
 * The open failed after the switch: leave the room, reset, and reopen the
 * work it kept (or start an empty project), then show `error` on the panel
 * (none for 'Back to my work').
 */
async function failAfterSwitch(
  run: Run,
  deps: SessionDeps,
  user: SessionUser,
  failedClaim: DraftClaim,
  kept: DraftMeta | null,
  error: OpenError | null,
): Promise<OpenOutcome> {
  if (useStore.getState().roomId !== null) deps.collab.leaveRoom();
  resetProjectState('open:failed');
  resetUndoHistory();
  resetCloudSaveForSession();

  let restored: 'kept' | 'empty' = 'empty';
  let nothing = false;
  if (kept) {
    try {
      deps.drafts.release(failedClaim);
      await deps.drafts.unkeep(kept.draftId);
      const claim = await deps.drafts.claim(user, {
        draftId: kept.draftId,
        boot: false,
      });
      const prepared = await deps.drafts.read(claim);
      deps.drafts.activate(claim);
      useSessionStore.setState({
        draftId: claim.draftId,
        userKey: claim.userKey,
        roomId: null,
      });
      resetProjectState('open:restore');
      deps.drafts.apply(prepared);
      markDocumentBaseline({
        savedComplete:
          claim.mode === 'fork' ? true : draftIsCloudEqual(prepared.meta),
      });
      resetUndoHistory();
      const generation = getSessionGeneration();
      await deps.drafts.begin(baselineFor('stored', prepared, claim));
      // After begin, as an open does: the record reaches the draft.
      if (claim.mode !== 'fork' && getSessionGeneration() === generation) {
        const record = lastSavedFromDraft(
          prepared.meta.cloud,
          useStore.getState().projectId,
        );
        if (record) setLastSaved(record);
      }
      void deps.drafts
        .restoreMedia(prepared.meta, generation)
        .catch((err: unknown) =>
          console.warn('[open] the kept media could not be restored', err),
        );
      restored = 'kept';
    } catch (err) {
      console.error('[open] the kept work could not be reopened', err);
    }
  }
  if (restored === 'empty') {
    resetProjectState('open:failed');
    resetUndoHistory();
    let claim: DraftClaim | null = failedClaim;
    if (kept || failedClaim.mode !== 'new') {
      // The failed claim may name a draft with work: never empty it.
      deps.drafts.release(failedClaim);
      try {
        claim = await deps.drafts.claim(user, { boot: false });
      } catch (err) {
        console.error('[open] could not claim an empty draft', err);
        // A new draft of its own is safe to reuse; any other is not.
        claim = failedClaim.mode === 'new' ? failedClaim : null;
      }
      if (claim) deps.drafts.activate(claim);
    }
    if (claim) {
      useSessionStore.setState({
        draftId: claim.draftId,
        userKey: claim.userKey,
        roomId: null,
      });
      markDocumentBaseline({ savedComplete: true });
      try {
        await deps.drafts.begin({
          source: 'empty',
          reopenable: true,
          fingerprint: hashFingerprint(documentFingerprint()),
        });
      } catch (err) {
        console.error('[open] could not start the empty draft', err);
      }
    } else {
      // No draft to write to: no session, so 'Back to my work' resumes.
      nothing = true;
      useSessionStore.setState({ draftId: null, userKey: null, roomId: null });
      markDocumentBaseline({ savedComplete: true });
    }
  }

  pageOpened = true;
  const generation = getSessionGeneration();
  const panel = error ? onPanel(error) : nothing ? NOTHING_REOPENED : null;
  const outcome: OpenOutcome = panel
    ? { status: 'failed', error: panel, restored }
    : { status: 'cancelled' };
  run.phase = panel ? 'failed' : 'ready';
  write(run, {
    phase: run.phase,
    overlay: 'none',
    label: null,
    waitingFor: null,
    cancellable: false,
    error: panel,
    retryIntent: panel?.retryable ? run.requested : null,
    lastOutcome: outcome,
    generation,
    roomId: null,
  });
  clearTimers(run);
  stripConsumedKeys(run);
  return outcome;
}

/**
 * The session stays as it is (a return to the editor, the project already
 * open, a link for the room this tab is in).
 */
function liveReady(run: Run): OpenOutcome {
  const state = useSessionStore.getState();
  const outcome: OpenOutcome = {
    status: 'ready',
    draftId: state.draftId ?? '',
    kept: null,
    forked: false,
    generation: getSessionGeneration(),
  };
  run.phase = 'ready';
  if (owns(run)) {
    useSessionStore.setState({
      phase: state.draftId !== null ? 'ready' : state.phase,
      overlay: 'none',
      label: null,
      waitingFor: null,
      cancellable: false,
      lastOutcome: outcome,
    });
  }
  clearTimers(run);
  stripConsumedKeys(run);
  announceCarriedKept(run);
  return outcome;
}

/**
 * An open that ends before keeping: nothing changed. Releases its claim,
 * settles the overlay, strips the link's keys (not for 'superseded'), and
 * on a cold page carries on with the last session.
 */
async function endEarly(
  run: Run,
  release: { deps: SessionDeps; claim: DraftClaim } | null,
  cold: boolean | null,
  outcome: OpenOutcome,
  panelError: OpenError | null = null,
  resumeAfter = true,
): Promise<OpenOutcome> {
  if (release) {
    try {
      release.deps.drafts.release(release.claim);
    } catch (err) {
      console.warn('[open] could not release the claimed draft', err);
    }
  }
  run.phase = 'idle';
  clearTimers(run);
  if (outcome.status === 'superseded') {
    rememberSupersededLink(run);
    return outcome;
  }
  if (owns(run)) {
    useSessionStore.setState({
      phase: restingPhase(),
      overlay: 'none',
      label: null,
      waitingFor: null,
      cancellable: false,
      lastOutcome: outcome,
    });
  }
  stripConsumedKeys(run);
  // Work a superseded collab load kept, still untold (this open replaced
  // nothing, so it is the last one to end).
  announceCarriedKept(run);
  // A cold page still opens something: the last session.
  if (
    cold &&
    resumeAfter &&
    run.requested.kind !== 'resume' &&
    !editorGone(run) &&
    latest === run &&
    useSessionStore.getState().draftId === null
  ) {
    latest = null;
    await openSession({ kind: 'resume' }, { source: 'boot' });
  }
  if (panelError && (latest === null || latest === run)) {
    useSessionStore.setState({
      error: panelError,
      retryIntent: panelError.retryable ? run.requested : null,
    });
  }
  return outcome;
}

/** Refused: nothing changed. A toast now, or the panel once settled. */
function refuse(
  run: Run,
  cold: boolean,
  error: OpenError,
  opts: {
    release?: { deps: SessionDeps; claim: DraftClaim };
    resumeAfter?: boolean;
  } = {},
): Promise<OpenOutcome> {
  // A cold page whose resume was refused has no session at all: the panel
  // (Retry, and Back resumes again), never a toast it can't act on.
  const shown =
    cold &&
    run.requested.kind === 'resume' &&
    useSessionStore.getState().draftId === null &&
    error.surface === 'toast'
      ? { ...error, surface: 'panel' as const, retryable: true }
      : error;
  if (shown.surface === 'toast' && getSessionDeps()) showOpenError(shown);
  return endEarly(
    run,
    opts.release ?? null,
    cold,
    { status: 'refused', error: shown },
    shown.surface === 'panel' ? shown : null,
    opts.resumeAfter ?? true,
  );
}

// ── Rejoin ─────────────────────────────────────────────────────────────────

/**
 * The rejoin a return to the editor makes: the room the live session was
 * opened in, left behind without Leave (the editor closed), and not as its
 * host (a host leaving closed it). A room identity that isn't the live
 * session's is cleared instead (null then).
 */
function rejoinFor(deps: SessionDeps): OpenIntent | null {
  const s = useStore.getState();
  if (s.roomId === null || s.connectionStatus !== 'disconnected') return null;
  if (
    s.collabRole !== 'owner' &&
    useSessionStore.getState().roomId === s.roomId
  ) {
    return { kind: 'rejoin', roomId: s.roomId, role: s.collabRole };
  }
  // A stale identity: the live session isn't that room's.
  deps.collab.leaveRoom();
  return null;
}

async function executeRejoin(
  run: Run,
  deps: SessionDeps,
): Promise<OpenOutcome> {
  const intent = run.intent as Extract<OpenIntent, { kind: 'rejoin' }>;
  const s = useStore.getState();
  if (
    s.roomId !== intent.roomId ||
    useSessionStore.getState().roomId !== intent.roomId
  ) {
    if (s.roomId !== null && s.connectionStatus === 'disconnected') {
      deps.collab.leaveRoom();
    }
    return liveReady(run);
  }
  startOverlay(run);
  try {
    await waitFor(run, 'owner', () => deps.user());
    await waitFor(run, 'token', () => deps.token());
  } catch (err) {
    if (err instanceof WaitTimeout) {
      return refuse(run, false, waitTimeoutError(err.waitingFor));
    }
    return endEarly(run, null, false, { status: abortedStatus(run) });
  }

  let releaseLate!: () => void;
  lateIdle = new Promise<void>((resolve) => {
    releaseLate = resolve;
  });
  lateHolder = run;
  try {
    setPhase(run, 'loading', intentLabel(intent));
    deps.collab.joinRoomById(intent.roomId, intent.role);
    const result = await waitForRoom(run, intent.roomId.trim().toLowerCase());
    if (result.status === 'aborted') {
      if (useStore.getState().roomId !== null) deps.collab.leaveRoom();
      if (result.reason === 'back') return liveReady(run);
      run.phase = 'idle';
      return { status: 'superseded' };
    }
    if (result.status === 'failed') {
      // The project stays as it is; the room is gone.
      if (useStore.getState().roomId !== null) deps.collab.leaveRoom();
      useSessionStore.setState({ roomId: null });
      const error = { ...result.error, surface: 'toast' as const };
      if (!editorGone(run)) announceRoomGone(error.message);
      return endEarly(run, null, false, { status: 'refused', error });
    }
    return liveReady(run);
  } finally {
    if (lateHolder === run) lateHolder = null;
    releaseLate();
  }
}

// ── Controls the overlay and the panel use ─────────────────────────────────

/** The overlay's Cancel: aborts the open while nothing has changed yet. */
export function cancelOpen(): void {
  const run = latest;
  if (run && EARLY_PHASES.has(run.phase) && run.requested.kind !== 'resume') {
    run.controller.abort('cancelled');
  }
}

/** The panel's Retry: the open that failed, again. */
export function retryOpen(): Promise<OpenOutcome | null> {
  const { retryIntent } = useSessionStore.getState();
  if (!retryIntent) return Promise.resolve(null);
  clearPanel();
  return openSession(retryIntent, { source: 'panel' });
}

/**
 * 'Back to my work': during a collab host wait, give up the join and reopen
 * the work the open kept; on the panel, close it (the work it kept is open
 * already, or listed in Projects). A page left with no session at all (a
 * cold boot whose open failed) resumes its last session.
 */
export function backToMyWork(): Promise<OpenOutcome | null> {
  const holder = lateHolder;
  if (holder?.collabWait) {
    holder.collabWait.abort('back');
    return Promise.resolve(null);
  }
  clearPanel();
  return resumeIfStranded();
}

/** Close the panel; a page with no session carries on with its last one. */
export function dismissOpenError(): void {
  clearPanel();
  void resumeIfStranded();
}

function clearPanel(): void {
  const state = useSessionStore.getState();
  useSessionStore.setState({
    error: null,
    retryIntent: null,
    ...(state.phase === 'failed' ? { phase: restingPhase() } : {}),
  });
}

/**
 * The editor holds no session (no draft, nothing opening): resume, so
 * nothing the student does goes unsaved. It waits for sign-in again.
 */
function resumeIfStranded(): Promise<OpenOutcome | null> {
  if (
    useSessionStore.getState().draftId !== null ||
    latest !== null ||
    lateHolder !== null ||
    getSessionDeps() === null
  ) {
    return Promise.resolve(null);
  }
  return openSession({ kind: 'resume' }, { source: 'panel' });
}

/** Close the Premium lesson prompt. */
export function dismissUpgradeLesson(): void {
  useSessionStore.setState({ upgradeLessonId: null });
}

setNoticeOpener(openSession);
