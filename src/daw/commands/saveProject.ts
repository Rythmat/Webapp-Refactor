import { showError, showSuccess, showWarning } from '@/components/utils/toast';
import {
  documentSnapshot,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { isOpening } from '@/daw/session/sessionStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  activeDraftIdForSave,
  classifyStudioFailure,
  isStudioApiError,
  SaveSupersededError,
  saveCurrentProjectToCloud,
  warnAudioLeftOut,
  type CloudSaveDone,
  type SaveMode,
} from '@/lib/studio-projects/api';
import { useStore } from '@/daw/store';
import {
  useCloudSaveStore,
  type LastSaved,
  type SaveError,
  type SaveErrorKind,
  type SaveResult,
  type SaveSource,
} from './cloudSaveStore';
import { groupsFromGaps, stayOnDevicePhrase } from './lastSaved';

// ── saveProject: the one way the Studio saves to the cloud (milestone 1.4) ──
//
// File ▸ Save, Cmd/Ctrl-S, the save chip's Retry, the leave prompt and Save
// As all come here (spec E12). It
// - refuses quietly while a session is opening (the open settles saves);
// - commits a focused text field in the editor first (the project name and
//   BPM commit on blur), so Cmd-S saves what is on screen;
// - runs one save at a time: a plain save asked while one runs joins the one
//   waiting behind it (one 'again', saving the newest state), while Save As
//   and a leave copy each queue a save of their own and never join a create;
// - fences each save to the session it was asked in (saveCurrentProjectToCloud
//   with a fence): a save that outlives its session touches nothing open now;
// - tells the student in plain words, for menu and shortcut alike: 'Project
//   saved', and which parts stay on this device for now when today's cloud
//   can't hold them;
// - records the result in useCloudSaveStore for the chip: phase, error, the
//   last save (its snapshot's hash and version) and savedCount;
// - after an offline failure, tries once more when the browser is back
//   online.
// It never throws.

/** Where the save asks for a token: DawApp's, or useKeyboardShortcuts'. */
const tokenGetters: Array<() => string | null> = [];

/**
 * Let saveProject read the signed-in token. The newest registration that
 * answers wins. Returns the unregister.
 */
export function registerSaveAuth(getToken: () => string | null): () => void {
  tokenGetters.push(getToken);
  return () => {
    const index = tokenGetters.lastIndexOf(getToken);
    if (index >= 0) tokenGetters.splice(index, 1);
  };
}

function currentToken(): string | null {
  for (let i = tokenGetters.length - 1; i >= 0; i--) {
    try {
      const token = tokenGetters[i]();
      if (token) return token;
    } catch {
      // A getter that fails answers nothing.
    }
  }
  return null;
}

// ── Words ───────────────────────────────────────────────────────────────────

const RETRY_ONLINE = " It will try again when you're back online.";

/** What a failed save tells the student: plain words, no ids or codes. */
export const SAVE_ERROR_MESSAGES: Readonly<Record<SaveErrorKind, string>> = {
  'signed-out': "Couldn't save: you're signed out.",
  offline: "Couldn't save: you're offline.",
  'not-found': "Couldn't save: the saved copy can't be found.",
  'no-access': "Couldn't save: this project belongs to another account.",
  upload: "Couldn't save: some audio didn't upload. Try again.",
  server: "Couldn't save: the server had a problem. Try again in a moment.",
  'too-large':
    "Couldn't save: this project is too big to save to your account.",
  conflict: "Couldn't save: this project was changed somewhere else.",
  superseded: 'The save stopped because another project opened.',
  unknown: "Couldn't save. Try again.",
};

const SAVED_AS_NEW =
  'The saved copy was deleted, so this was saved as a new project';
const SAVED_TO_YOUR_ACCOUNT =
  'This project was saved to your account as a new project';

/** A request that never answered: kind 'server', in its own words. */
const TIMED_OUT_MESSAGE =
  "Couldn't save: the server took too long to answer. Try again.";

/**
 * ' — chord symbols and notation stay on this device for now', or ''. From
 * what the save's own snapshot left out (done.gaps), not the document as it
 * stands now; an incomplete save never reads as a clean one.
 */
function caveat(done: CloudSaveDone): string {
  if (done.complete) return '';
  const groups = groupsFromGaps(done.gaps);
  if (groups.length === 0) {
    groups.push(done.echoMismatch ? 'track settings' : 'some settings');
  }
  return stayOnDevicePhrase(groups);
}

// ── Errors ─────────────────────────────────────────────────────────────────

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const failureKind: Record<
  ReturnType<typeof classifyStudioFailure>,
  SaveErrorKind
> = {
  offline: 'offline',
  'signed-out': 'signed-out',
  'no-access': 'no-access',
  'not-found': 'not-found',
  'too-large': 'too-large',
  conflict: 'conflict',
  server: 'server',
  timeout: 'server',
  unknown: 'unknown',
};

/** A thrown save failure as the SaveError the chip and the toast word. */
export function toSaveError(err: unknown, mode: SaveMode = 'save'): SaveError {
  const make = (kind: SaveErrorKind, extra: Partial<SaveError> = {}) => {
    let message = SAVE_ERROR_MESSAGES[kind];
    if (kind === 'offline' && mode === 'save') message += RETRY_ONLINE;
    return { kind, message, ...extra };
  };
  if (err instanceof SaveSupersededError) return make('superseded');
  const name = err instanceof Error ? err.name : '';
  if (name === 'PartialUploadError' || name === 'AudioUploadError') {
    if (isOffline()) return make('offline', { status: 0 });
    const counts = err as { succeededCount?: number; failedCount?: number };
    const failures = (err as { failures?: readonly unknown[] }).failures;
    return make('upload', {
      uploads: {
        succeeded: counts.succeededCount ?? 0,
        failed: counts.failedCount ?? failures?.length ?? 0,
      },
    });
  }
  const status = isStudioApiError(err) ? err.status : undefined;
  const failure = classifyStudioFailure(err);
  let kind = failureKind[failure];
  if ((kind === 'unknown' || kind === 'server') && isOffline()) {
    kind = 'offline';
  }
  const error = make(kind, status === undefined ? {} : { status });
  if (failure === 'timeout' && kind === 'server') {
    error.message = TIMED_OUT_MESSAGE;
  }
  return error;
}

// ── Running saves ──────────────────────────────────────────────────────────

interface SaveEntry {
  mode: SaveMode;
  nameOverride?: string;
  source: SaveSource;
  generation: number;
  draftId: string | null;
  /** The cloud link when it was asked for. */
  projectId: string | null;
  /** A text field was blurred: let its commit land first. */
  blurred: boolean;
  started: boolean;
  promise: Promise<SaveResult>;
}

// Every saveProject request, in order: each runs once the one before has
// settled. (saveCurrentProjectToCloud also queues against the deprecated
// callers still on the old path.)
let chain: Promise<unknown> = Promise.resolve();
// The plain save waiting its turn, which a repeat joins.
let waitingPlain: SaveEntry | null = null;
// Saves of each session generation still queued or running.
const runningByGeneration = new Map<number, number>();
// The one 'online' retry armed after an offline failure.
let onlineRetry: (() => void) | null = null;

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const EDITABLE = '[contenteditable]:not([contenteditable="false"])';

/**
 * Blur a text field the student is typing in inside the editor: the name
 * and BPM fields commit on blur, so a save sends what is on screen.
 */
function blurFocusedEditable(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (!active.closest('.daw-root')) return false;
  const editable =
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active.closest(EDITABLE) !== null;
  if (!editable) return false;
  active.blur();
  return true;
}

const failed = (error: SaveError): SaveResult => ({ status: 'failed', error });

/**
 * Save the open project to the student's account. One path for every
 * control; see the header. Resolves with what happened; never throws.
 */
export function saveProject(opts: {
  source: SaveSource;
  saveAs?: { name: string };
  asNewProject?: boolean;
}): Promise<SaveResult> {
  if (isOpening()) {
    return Promise.resolve(failed(toSaveError(new SaveSupersededError())));
  }
  const mode: SaveMode = opts.saveAs
    ? 'saveAs'
    : opts.asNewProject
      ? 'asNew'
      : 'save';
  const generation = getSessionGeneration();
  const blurred = blurFocusedEditable();

  const waiting = waitingPlain;
  if (
    mode === 'save' &&
    waiting !== null &&
    !waiting.started &&
    waiting.generation === generation
  ) {
    waiting.source = opts.source;
    waiting.blurred ||= blurred;
    useCloudSaveStore.setState({ phase: 'saving', source: opts.source });
    return waiting.promise;
  }

  const entry: SaveEntry = {
    mode,
    nameOverride: opts.saveAs?.name.trim() || undefined,
    source: opts.source,
    generation,
    draftId: activeDraftIdForSave(),
    projectId: useStore.getState().projectId,
    blurred,
    started: false,
    promise: Promise.resolve(failed(toSaveError(null))),
  };
  if (mode === 'saveAs' && entry.nameOverride === undefined) {
    return Promise.resolve(
      failed({ kind: 'unknown', message: 'Name the copy to save it.' }),
    );
  }

  begin(entry);
  entry.promise = chain
    .then(() => {
      entry.started = true;
      if (waitingPlain === entry) waitingPlain = null;
      return run(entry);
    })
    .catch((err: unknown): SaveResult => {
      // run() handles its own failures; this is a bug guard.
      console.error('[save] unexpected failure', err);
      return failed(toSaveError(err, mode));
    })
    .then((result) => {
      settle(entry, result);
      return result;
    });
  chain = entry.promise;
  if (mode === 'save') waitingPlain = entry;
  return entry.promise;
}

function begin(entry: SaveEntry): void {
  runningByGeneration.set(
    entry.generation,
    (runningByGeneration.get(entry.generation) ?? 0) + 1,
  );
  useCloudSaveStore.setState((state) => ({
    inFlight: state.inFlight + 1,
    phase: 'saving',
    source: entry.source,
  }));
}

/** The entry is done: count it out, and set the chip's phase if it's ours. */
function settle(entry: SaveEntry, result: SaveResult): void {
  const left = (runningByGeneration.get(entry.generation) ?? 1) - 1;
  if (left > 0) runningByGeneration.set(entry.generation, left);
  else runningByGeneration.delete(entry.generation);

  const current = getSessionGeneration() === entry.generation;
  useCloudSaveStore.setState((state) => {
    const next: Partial<typeof state> = {
      inFlight: Math.max(0, state.inFlight - 1),
    };
    if (!current) {
      // Another session opened meanwhile: what this save did is its draft's
      // business now. The live session's phase is its own saves'.
      if (!runningByGeneration.has(getSessionGeneration())) {
        if (state.phase === 'saving') next.phase = 'idle';
      }
      return next;
    }
    if (left > 0) return next; // the next save of this session runs now
    if (result.status === 'saved') {
      next.phase = 'idle';
      next.error = null;
    } else if (result.error.kind === 'superseded') {
      next.phase = state.error ? 'error' : 'idle';
    } else {
      next.phase = 'error';
      next.error = result.error;
    }
    return next;
  });
}

async function run(entry: SaveEntry): Promise<SaveResult> {
  const { generation, mode } = entry;
  if (entry.blurred) await macrotask();
  if (getSessionGeneration() !== generation) {
    return failed(toSaveError(new SaveSupersededError()));
  }
  const token = currentToken();
  if (!token) {
    return fail(entry, {
      kind: 'signed-out',
      message: SAVE_ERROR_MESSAGES['signed-out'],
    });
  }

  try {
    const outcome = await saveCurrentProjectToCloud(token, {
      fence: { generation, draftId: entry.draftId },
      nameOverride: entry.nameOverride,
      mode,
      expectProjectId: mode === 'save' ? entry.projectId : undefined,
    });
    if (outcome.status === 'superseded') {
      return failed(toSaveError(new SaveSupersededError()));
    }
    succeed(entry, outcome);
    return {
      status: 'saved',
      projectId: outcome.projectId,
      complete: outcome.complete,
      audioLeftOut: outcome.audioClipsLeftOut + outcome.samplerSamplesLeftOut,
      recreated: outcome.recreated,
      asCopy: outcome.asCopy,
    };
  } catch (err) {
    console.error('[save] cloud save failed', err);
    return fail(entry, toSaveError(err, mode));
  }
}

/** A failure the student hears of (only in the session it was asked in). */
function fail(entry: SaveEntry, error: SaveError): SaveResult {
  if (getSessionGeneration() !== entry.generation) return failed(error);
  if (error.kind === 'superseded') return failed(error);
  useCloudSaveStore.setState({ error });
  showError(error.message);
  if (error.kind === 'offline' && entry.mode === 'save') {
    armOnlineRetry(entry);
  }
  return failed(error);
}

/** A save that finished in its own session: the record, the toasts. */
function succeed(entry: SaveEntry, done: CloudSaveDone): void {
  if (getSessionGeneration() !== done.generation) return;
  disarmOnlineRetry();
  // The chip's fast path compares versions. The link a first save or a copy
  // stamps moves documentVersion without changing the document: when the
  // document is still the snapshot, the record takes the version it has now.
  // (Unchanged version: nothing to fingerprint again.)
  const liveVersion = useSaveStatusStore.getState().documentVersion;
  let version = done.snapshot.version;
  if (liveVersion !== version) {
    const now = documentSnapshot();
    if (hashFingerprint(now.fingerprint) === done.snapshot.fingerprint) {
      version = now.version;
    }
  }
  const record: LastSaved = {
    projectId: done.projectId,
    fingerprint: done.snapshot.fingerprint,
    version,
    complete: done.complete,
    updatedAt: done.updatedAt,
    at: Date.now(),
    generation: done.generation,
  };
  useCloudSaveStore.setState((state) => ({
    lastSaved: record,
    error: null,
    savedCount: state.savedCount + 1,
  }));

  const suffix = caveat(done);
  if (done.recreated) {
    showWarning(
      done.recreatedReason === 'other-account'
        ? SAVED_TO_YOUR_ACCOUNT
        : SAVED_AS_NEW,
    );
  } else if (entry.source === 'leave') {
    // The leave flow words its own outcome (it also sets the session aside).
  } else if (entry.mode === 'saveAs') {
    showSuccess(`Saved as “${entry.nameOverride}”${suffix}`);
  } else if (entry.mode === 'asNew') {
    showSuccess(`Saved to your projects${suffix}`);
  } else {
    showSuccess(`Project saved${suffix}`);
  }
  if (done.unrecoverable > 0) {
    showError(
      `${done.unrecoverable} audio recording(s) could no longer be found and were removed from the saved project.`,
    );
  }
  warnAudioLeftOut(done.audioClipsLeftOut, done.samplerSamplesLeftOut);
}

/** Try the save once more when the browser is back online. */
function armOnlineRetry(entry: SaveEntry): void {
  if (typeof window === 'undefined') return;
  disarmOnlineRetry();
  const retry = () => {
    disarmOnlineRetry();
    if (getSessionGeneration() !== entry.generation) return;
    void saveProject({ source: entry.source });
  };
  onlineRetry = retry;
  window.addEventListener('online', retry);
}

function disarmOnlineRetry(): void {
  if (onlineRetry && typeof window !== 'undefined') {
    window.removeEventListener('online', onlineRetry);
  }
  onlineRetry = null;
}
