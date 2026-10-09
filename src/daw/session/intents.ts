import { getSong } from '@/curriculum/data/songs';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import { ensureSongContent } from '@/content/songStore';
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { applyDemo, prepareDemo } from '@/daw/data/demoSeed';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import { seedTemplateSynthPatches } from '@/daw/data/templateSynthPatches';
import {
  applyJamSession,
  readPendingJam,
} from '@/daw/jam-import/importJamSession';
import { clearJamSession } from '@/daw/jam-import/jamSession';
import { deserializeCloudProject } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import {
  cloudOpenedRecord,
  lastSavedFromDraft,
} from '@/daw/commands/lastSaved';
import {
  useCloudSaveStore,
  type LastSaved,
} from '@/daw/commands/cloudSaveStore';
import type { PracticeMode } from '@/features/practiceTracks/generatePracticeTrack';
import {
  practiceSessionFor,
  resolvePracticeTrack,
  takePracticeTrack,
} from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { applyGenrePracticeTrack } from '@/features/practiceTracks/genre/seedStudioFromGenrePracticeTrack';
import {
  applyPracticeModeTrack,
  preparePracticeModeTrack,
} from '@/features/practiceTracks/seedStudioFromPracticeTrack';
import { applySong } from '@/features/songs/seedStudioFromSong';
import { DEVICE_USER_KEY } from '@/lib/local-store/userScope';
import { urlParamToSemitone } from '@/lib/musicKeyUrl';
import { draftIsCloudEqual } from '@/lib/studio-projects/drafts/predicates';
import {
  isDraftStorageError,
  type DraftBaseline,
} from '@/lib/studio-projects/drafts/types';
import {
  studioProjectsApi,
  type StudioProjectDetail,
} from '@/lib/studio-projects/projectsClient';
import { classifyStudioFailure } from '@/lib/studio-projects/studioApiError';
import { NOT_FOUND_MESSAGES, notFoundError } from './parseBootIntent';
import { openError, openErrorFromFailure, signedOutError } from './openErrors';
import {
  announceOpenedProjectDraft,
  announceProjectDraftKept,
} from './sessionNotices';
import type { SessionDeps } from './sessionDeps';
import type {
  BootNotice,
  CollabPort,
  DraftClaim,
  DraftSessionPort,
  OpenError,
  OpenIntent,
  OpenSource,
  PreparedDraft,
  SessionUser,
  WaitingFor,
} from './types';

// ── What each intent fetches, builds and writes (milestone 1.4) ────────────
//
// openSession's per-intent half. prepareIntent runs before anything
// changes: it fetches or builds what the intent opens (abortable, a 20 s
// limit on each fetch), claims the draft the session will write to (a new
// one, or the draft it reopens), and returns the synchronous apply that
// openSession runs after its reset, with how to baseline it and what to do
// once it is ready. A refusal (an id that names nothing, a failed fetch) is
// an OpenRefusal: nothing has changed, and the claim is released first.

/** How long one fetch or build of a prepare may take. */
export const PREPARE_TIMEOUT_MS = 20_000;

/** A prepare that can't go on: nothing changed. */
export class OpenRefusal extends Error {
  readonly error: OpenError;
  constructor(error: OpenError) {
    super(error.message);
    this.name = 'OpenRefusal';
    this.error = error;
  }
}

/** What a ready session's extras get. */
export interface ReadyEnv {
  deps: SessionDeps;
  /** The session generation the open settled on. */
  generation: number;
  /** False once another session replaced this one. */
  stillCurrent(): boolean;
  /** The session's draft record was written (begin succeeded). */
  draftWritten: boolean;
}

/** An intent made ready to open. */
export interface PreparedOpen {
  /** The draft the session writes to. */
  claim: DraftClaim;
  /** The draft it reopens (draft, resume, a project's unsaved changes). */
  draft: PreparedDraft | null;
  /** The name the Opening overlay shows, once known. */
  name: string | null;
  /** Sync, after the reset: write the session in. */
  apply(ports: { collab: CollabPort; drafts: DraftSessionPort }): void;
  /** Whether the session as it opens is a complete copy kept elsewhere. */
  savedComplete: boolean;
  /** The new draft's baseline (its fingerprint is taken after the apply); 'stored' keeps the draft's own. */
  baseline: Omit<DraftBaseline, 'fingerprint'> | 'stored';
  /** The save chip's record of the cloud copy, after the baseline. */
  lastSaved(): LastSaved | null;
  /** A joiner waits for the room's first sync after the apply. */
  collabWait: { roomId: string; awaitHost: boolean } | null;
  /** A '~device' draft moves to this user as it opens. */
  claimDevice: boolean;
  /** Generation-guarded steps and toasts once ready (editor still mounted). */
  afterReady(env: ReadyEnv): void;
}

/** E11's 'do nothing': the live session already is the project asked for. */
export interface UnchangedOpen {
  noop: true;
}

export interface PrepareContext {
  deps: SessionDeps;
  user: SessionUser;
  signal: AbortSignal;
  /** No session is open in this page yet. */
  cold: boolean;
  /** The live session's draft (sessionStore.draftId). */
  liveDraftId: string | null;
  /** The cold boot's notices (prepareUser), filled in by the prepare. */
  notices: BootNotice[];
  /** Who asked (a resume from the panel is the student's second try). */
  source?: OpenSource;
}

// ── Labels ─────────────────────────────────────────────────────────────────

const quoted = (name: string) => `‘${name}’`;

/** The Opening overlay's line for `intent`, `name` once known. */
export function intentLabel(intent: OpenIntent, name?: string | null): string {
  switch (intent.kind) {
    case 'resume':
      return 'Opening your last session…';
    case 'tutorial': {
      const title = name ?? getTutorial(intent.tutorialId)?.title ?? null;
      return title ? `Opening lesson ${quoted(title)}…` : 'Opening the lesson…';
    }
    case 'practiceMode':
    case 'practiceGenre':
      return 'Building your practice track…';
    case 'collab':
      if (intent.code === 'new') return 'Starting a session…';
      return intent.awaitHost
        ? 'Waiting for the host to open the session…'
        : `Joining session ${intent.code}…`;
    case 'rejoin':
      return `Joining session ${intent.roomId}…`;
    case 'template': {
      const label = name ?? getProjectTemplate(intent.templateId)?.label;
      return label ? `Opening ${quoted(label)}…` : 'Opening the template…';
    }
    case 'demo': {
      const label = name ?? getDemoProject(intent.demoId)?.label;
      return label ? `Opening ${quoted(label)}…` : 'Opening the demo…';
    }
    case 'new':
      return `Opening ${quoted('Untitled Project')}…`;
    case 'jam':
      return `Opening ${quoted(name ?? 'Jam session')}…`;
    default:
      return name ? `Opening ${quoted(name)}…` : 'Opening your project…';
  }
}

/** The overlay's line while an open waits on something. */
export function waitingLabel(waitingFor: WaitingFor): string | null {
  switch (waitingFor) {
    case 'owner':
    case 'token':
      return 'Signing you in…';
    case 'plan':
      return 'Checking your plan…';
    case 'save':
      return 'Finishing your save…';
    case 'take':
      return 'Finishing your recording…';
    case 'host':
      return 'Waiting for the host to open the session…';
    default:
      return null;
  }
}

/** Whether `intent` needs the sign-in token before it opens. */
export function needsToken(intent: OpenIntent): boolean {
  return (
    intent.kind === 'project' ||
    intent.kind === 'collab' ||
    intent.kind === 'rejoin'
  );
}

// ── Abort and time limits ──────────────────────────────────────────────────

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Aborted', 'AbortError');
}

/** `signal`, aborted too after `ms` (a TimeoutError). */
export function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(new DOMException('The open timed out', 'TimeoutError')),
    ms,
  );
  const onAbort = () => {
    clearTimeout(timer);
    controller.abort(abortError(signal));
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    },
    { once: true },
  );
  return controller.signal;
}

/**
 * `work` raced against `signal` and a time limit: a build that takes no
 * signal (a groove fetch, the song library) still lets the open move on.
 */
export function raceSignal<T>(
  work: Promise<T>,
  signal: AbortSignal,
  ms = PREPARE_TIMEOUT_MS,
): Promise<T> {
  const limited = withTimeout(signal, ms);
  if (limited.aborted) return Promise.reject(abortError(limited));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(limited));
    limited.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => {
        limited.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        limited.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

/** Rethrow the caller's own abort (supersede, cancel) as it came. */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError(signal);
}

/** Same instant on the server's clock (ISO strings or Dates; null never matches). */
export function sameServerTime(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  const ta = a instanceof Date ? a.getTime() : Date.parse(a);
  const tb = b instanceof Date ? b.getTime() : Date.parse(b);
  return Number.isFinite(ta) && ta === tb;
}

// ── Claims ─────────────────────────────────────────────────────────────────

/**
 * Claim a draft within the prepare's time limit. A claim that lands after
 * the race was given up is released, so its lock never lingers.
 */
async function claimWithin(
  ctx: PrepareContext,
  target: { draftId?: string; boot: boolean },
): Promise<DraftClaim> {
  const pending = ctx.deps.drafts.claim(ctx.user, target, ctx.signal);
  try {
    return await raceSignal(pending, ctx.signal);
  } catch (err) {
    pending.then(
      (late) => ctx.deps.drafts.release(late),
      () => {},
    );
    throw err;
  }
}

async function claimNew(ctx: PrepareContext): Promise<DraftClaim> {
  return claimWithin(ctx, { boot: false });
}

/**
 * Claim and read `draftId`. The claim is released when the read fails, and
 * the failure becomes the refusal; a draft another user owns names nothing.
 */
async function claimAndRead(
  ctx: PrepareContext,
  draftId: string,
  boot: boolean,
): Promise<PreparedDraft> {
  const claim = await claimWithin(ctx, { draftId, boot });
  let prepared: PreparedDraft;
  try {
    prepared = await raceSignal(ctx.deps.drafts.read(claim), ctx.signal);
    throwIfAborted(ctx.signal);
  } catch (err) {
    ctx.deps.drafts.release(claim);
    if (ctx.signal.aborted) throw abortError(ctx.signal);
    if (err instanceof OpenRefusal) throw err;
    throw new OpenRefusal(openErrorFromFailure(err, 'draft'));
  }
  const owner = prepared.meta.userKey;
  if (owner !== ctx.user.userKey && owner !== DEVICE_USER_KEY) {
    ctx.deps.drafts.release(claim);
    throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.draft));
  }
  return prepared;
}

const noExtras = () => {};
const noLastSaved = () => null;

/** A session that opens from a seed into a new draft. */
function seeded(
  claim: DraftClaim,
  fields: Partial<PreparedOpen> &
    Pick<PreparedOpen, 'apply' | 'baseline'> & { name?: string | null },
): PreparedOpen {
  return {
    claim,
    draft: null,
    name: fields.name ?? null,
    savedComplete: true,
    lastSaved: noLastSaved,
    collabWait: null,
    claimDevice: false,
    afterReady: noExtras,
    ...fields,
  };
}

/** A session that reopens a draft as it was stored. */
function fromDraft(
  prepared: PreparedDraft,
  extra: Partial<PreparedOpen> = {},
): PreparedOpen {
  return {
    claim: prepared.claim,
    draft: prepared,
    name: prepared.meta.name || null,
    apply: ({ drafts }) => drafts.apply(prepared),
    // A fork's cloud link is cleared; otherwise as the draft remembers.
    savedComplete:
      prepared.claim.mode === 'fork' ? true : draftIsCloudEqual(prepared.meta),
    baseline: 'stored',
    lastSaved: () =>
      prepared.claim.mode === 'fork'
        ? null
        : lastSavedFromDraft(
            prepared.meta.cloud,
            useStore.getState().projectId,
          ),
    collabWait: null,
    claimDevice: prepared.meta.userKey === DEVICE_USER_KEY,
    afterReady: noExtras,
    ...extra,
  };
}

// ── The intents ────────────────────────────────────────────────────────────

/**
 * Fetch, build and claim what `intent` opens, changing nothing. Rejects with
 * an OpenRefusal, or with the signal's own reason once it aborts.
 */
export async function prepareIntent(
  intent: OpenIntent,
  ctx: PrepareContext,
): Promise<PreparedOpen | UnchangedOpen> {
  // Once per page and user (the port memoizes it): the legacy import, the
  // mirrors, the prune. A store that can't be read doesn't stop the open.
  try {
    // A draft intent's draft is kept from the boot prune until it is claimed.
    const prepare =
      intent.kind === 'draft'
        ? ctx.deps.drafts.prepareUser(ctx.user, ctx.signal, {
            protect: [intent.draftId],
          })
        : ctx.deps.drafts.prepareUser(ctx.user, ctx.signal);
    ctx.notices.push(...(await raceSignal(prepare, ctx.signal)));
  } catch (err) {
    throwIfAborted(ctx.signal);
    console.warn('[open] preparing the drafts failed', err);
    ctx.notices.push({ kind: 'storage-unavailable' });
  }
  throwIfAborted(ctx.signal);

  switch (intent.kind) {
    case 'resume':
      return prepareResume(ctx);
    case 'draft':
      return fromDraft(await claimAndRead(ctx, intent.draftId, false));
    case 'project':
      return prepareProject(intent, ctx);
    case 'new':
      return seeded(await claimNew(ctx), {
        apply: noExtras,
        baseline: { source: 'new', reopenable: true },
      });
    case 'template':
      return seeded(await claimNew(ctx), {
        name: getProjectTemplate(intent.templateId)?.label ?? null,
        apply: () => {
          useStore.getState().loadProjectTemplate(intent.templateId);
          // Its synth tracks' patches, before the baseline so they aren't an edit.
          seedTemplateSynthPatches(intent.templateId);
        },
        baseline: {
          source: 'template',
          ref: intent.templateId,
          reopenable: true,
        },
      });
    case 'demo': {
      const demo = await raceSignal(prepareDemo(intent.demoId), ctx.signal);
      if (!demo) throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.demo));
      return seeded(await claimNew(ctx), {
        name: demo.demo.label,
        apply: () => applyDemo(demo),
        baseline: { source: 'demo', ref: intent.demoId, reopenable: true },
      });
    }
    case 'tutorial':
      return seeded(await claimNew(ctx), {
        name: getTutorial(intent.tutorialId)?.title ?? null,
        apply: () => useStore.getState().startTutorial(intent.tutorialId),
        baseline: {
          source: 'tutorial',
          ref: intent.tutorialId,
          reopenable: true,
        },
      });
    case 'song':
      return prepareSong(intent, ctx);
    case 'practiceMode':
      return preparePracticeMode(intent, ctx);
    case 'practiceGenre':
      return preparePracticeGenre(intent, ctx);
    case 'jam': {
      const jam = readPendingJam();
      if (!jam) throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.jam));
      return seeded(await claimNew(ctx), {
        apply: () => {
          applyJamSession(jam);
        },
        // The recording's only copy until it is saved: work to keep.
        savedComplete: false,
        baseline: { source: 'jam', reopenable: false },
        afterReady: ({ stillCurrent, draftWritten }) => {
          if (!stillCurrent()) return;
          // The hand-off goes only once the draft holds the jam.
          if (draftWritten) clearJamSession();
          useStore.getState().offerChordAnalysis();
        },
      });
    }
    case 'collab':
      return prepareCollab(intent, ctx);
    case 'rejoin':
      // openSession handles a rejoin itself: no keep, no reset.
      throw new Error('A rejoin is not prepared');
  }
}

async function prepareResume(ctx: PrepareContext): Promise<PreparedOpen> {
  let draftId: string | null = null;
  try {
    draftId = await raceSignal(
      ctx.deps.drafts.chooseResume(ctx.user),
      ctx.signal,
    );
  } catch (err) {
    throwIfAborted(ctx.signal);
    console.warn('[open] could not choose a draft to resume', err);
  }
  throwIfAborted(ctx.signal);
  if (draftId !== null) {
    try {
      return fromDraft(await claimAndRead(ctx, draftId, true));
    } catch (err) {
      throwIfAborted(ctx.signal);
      const why = resumeFailure(err);
      console.warn(`[open] the last session could not be opened (${why})`, err);
      if (why === 'corrupt') {
        // Quarantined by the read: the student hears of it, and the editor
        // opens on an empty project.
        ctx.notices.push({ kind: 'quarantined', count: 1 });
      } else if (why === 'transient') {
        // The store is stalled or failing: an empty project would take the
        // tab's pointer from the student's work. The panel, with Retry;
        // the second try (from the panel) opens an empty project.
        if (ctx.source !== 'panel') throw new OpenRefusal(RESUME_UNAVAILABLE);
        ctx.notices.push({ kind: 'storage-unavailable' });
      }
      // 'gone' (deleted, a newer build's, another user's): an empty project.
    }
  }
  return seeded(await claimNew(ctx), {
    apply: noExtras,
    baseline: { source: 'empty', reopenable: true },
  });
}

/** A resume whose draft the store can't hand over right now. */
const RESUME_UNAVAILABLE: OpenError = openError(
  'storage',
  'Your last session couldn’t be opened right now. Try again.',
  { surface: 'panel', retryable: true },
);

/** Why the draft a resume chose couldn't be opened. */
function resumeFailure(err: unknown): 'corrupt' | 'gone' | 'transient' {
  const cause = err instanceof OpenRefusal ? err.error.cause : err;
  if (isDraftStorageError(cause)) {
    if (cause.kind === 'corrupt') return 'corrupt';
    if (cause.kind === 'not-found' || cause.kind === 'readonly') return 'gone';
    return 'transient';
  }
  // A refusal without a storage cause: a draft another user owns.
  if (err instanceof OpenRefusal && err.error.kind === 'not-found') {
    return 'gone';
  }
  return 'transient';
}

async function prepareProject(
  intent: Extract<OpenIntent, { kind: 'project' }>,
  ctx: PrepareContext,
): Promise<PreparedOpen | UnchangedOpen> {
  const { deps, user, signal } = ctx;
  const { projectId } = intent;
  const token = deps.token();
  let project: StudioProjectDetail | null = null;
  let failure: unknown = null;
  try {
    if (!token) throw new OpenRefusal(signedOutError());
    project = await studioProjectsApi.get(token, projectId, {
      signal: withTimeout(signal, PREPARE_TIMEOUT_MS),
    });
  } catch (err) {
    throwIfAborted(signal);
    if (err instanceof OpenRefusal) throw err;
    failure = err;
  }
  throwIfAborted(signal);

  if (!intent.fromCloud) {
    // The live session already is this project, as the server still has
    // it: nothing to open.
    const live = useStore.getState();
    if (
      project !== null &&
      ctx.liveDraftId !== null &&
      live.projectId === projectId &&
      sameServerTime(
        useCloudSaveStore.getState().lastSaved?.updatedAt,
        project.updatedAt,
      )
    ) {
      return { noop: true };
    }

    // E11: this device's unsaved changes to the project, newest first.
    let local = null;
    try {
      local = await raceSignal(
        deps.drafts.findProjectDraft(user, projectId),
        signal,
      );
    } catch (err) {
      throwIfAborted(signal);
      console.warn('[open] could not look for a draft of the project', err);
    }
    throwIfAborted(signal);
    if (local) {
      const offline =
        project === null && classifyStudioFailure(failure) === 'offline';
      const unchangedSince =
        project !== null &&
        sameServerTime(local.cloud?.updatedAt, project.updatedAt);
      if (offline || unchangedSince) {
        try {
          const prepared = await claimAndRead(ctx, local.draftId, false);
          return fromDraft(prepared, {
            afterReady: ({ stillCurrent }) => {
              if (!stillCurrent()) return;
              if (unchangedSince) announceOpenedProjectDraft(projectId);
            },
          });
        } catch (err) {
          throwIfAborted(signal);
          // The draft can't be read: the cloud copy, when there is one.
          console.warn('[open] the project draft could not be read', err);
          if (project === null) {
            throw new OpenRefusal(openErrorFromFailure(failure, 'project'));
          }
        }
      } else if (project !== null) {
        const keptDraftId = local.draftId;
        return cloudProject(project, await claimNew(ctx), () =>
          announceProjectDraftKept(keptDraftId),
        );
      }
    }
  }

  if (project === null) {
    throw new OpenRefusal(openErrorFromFailure(failure, 'project'));
  }
  return cloudProject(project, await claimNew(ctx));
}

function cloudProject(
  project: StudioProjectDetail,
  claim: DraftClaim,
  notice?: () => void,
): PreparedOpen {
  return seeded(claim, {
    name: project.name || null,
    // Stable track ids (1.3); a decode that throws fails the open.
    apply: () =>
      deserializeCloudProject(
        project as unknown as Parameters<typeof deserializeCloudProject>[0],
      ),
    baseline: { source: 'project', ref: project.id, reopenable: true },
    lastSaved: () => cloudOpenedRecord(project),
    afterReady: ({ stillCurrent }) => {
      if (!stillCurrent()) return;
      useStore.getState().offerChordAnalysis();
      notice?.();
    },
  });
}

async function prepareSong(
  intent: Extract<OpenIntent, { kind: 'song' }>,
  ctx: PrepareContext,
): Promise<PreparedOpen> {
  try {
    await raceSignal(ensureSongContent(), ctx.signal);
  } catch (err) {
    throwIfAborted(ctx.signal);
    // The bundled library still answers.
    console.error('Song library failed to load', err);
  }
  const found = getSong(intent.songId);
  if (!found) throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.song));
  // The same chart the Song page showed for that transposition.
  const song =
    intent.transpose === 0 ? found : transposeSong(found, intent.transpose);
  return seeded(await claimNew(ctx), {
    name: song.title,
    apply: () => applySong(song),
    baseline: {
      source: 'song',
      ref:
        intent.transpose === 0
          ? intent.songId
          : `${intent.songId}@${intent.transpose}`,
      reopenable: true,
    },
  });
}

async function preparePracticeMode(
  intent: Extract<OpenIntent, { kind: 'practiceMode' }>,
  ctx: PrepareContext,
): Promise<PreparedOpen> {
  // `practiceRoot` is a letter-based key param (e.g. "d", "dsharp"),
  // decoded back to a 0-11 semitone from C as LessonContainer does.
  const root = urlParamToSemitone(intent.rootParam ?? undefined);
  let track;
  try {
    track = await raceSignal(
      preparePracticeModeTrack(
        intent.mode as PracticeMode,
        root,
        intent.openTrack,
        intent.level,
      ),
      ctx.signal,
    );
  } catch (err) {
    throwIfAborted(ctx.signal);
    console.error('Practice track failed to build', err);
    throw new OpenRefusal(openErrorFromFailure(err, 'practice'));
  }
  const built = track;
  return seeded(await claimNew(ctx), {
    apply: () => {
      applyPracticeModeTrack(built, {
        openTrack: intent.openTrack,
        level: intent.level,
      });
      const store = useStore.getState();
      store.setPracticeSession({
        kind: 'theory',
        mode: intent.mode,
        rootParam: intent.rootParam ?? 'c',
        level: intent.level,
        openTrack: intent.openTrack,
      });
      // A backing track to play over: loop it from the start.
      store.setLoopEnabled(true);
      store.setCurrentView('practice');
    },
    baseline: { source: 'practiceMode', ref: intent.mode, reopenable: true },
  });
}

async function preparePracticeGenre(
  intent: Extract<OpenIntent, { kind: 'practiceGenre' }>,
  ctx: PrepareContext,
): Promise<PreparedOpen> {
  const { genre, level, section } = intent;
  let resolved;
  try {
    // Peeks at the lesson's hand-off box; it is taken once ready.
    resolved = await raceSignal(
      resolvePracticeTrack(genre, level, section),
      ctx.signal,
    );
  } catch (err) {
    throwIfAborted(ctx.signal);
    console.error('Practice track failed to build', err);
    const error = openErrorFromFailure(err, 'practice');
    throw new OpenRefusal(
      error.surface === 'panel'
        ? error
        : notFoundError(NOT_FOUND_MESSAGES.practiceGenre),
    );
  }
  if (!resolved) {
    throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.practiceGenre));
  }
  const practice = resolved;
  return seeded(await claimNew(ctx), {
    apply: () => {
      applyGenrePracticeTrack(practice.track, practice.genreLabel);
      const store = useStore.getState();
      store.setPracticeSession(
        practiceSessionFor(
          practice.track,
          practice.genreLabel,
          practice.returnTo,
        ),
      );
      store.setCurrentView('practice');
    },
    baseline: {
      source: 'practiceGenre',
      ref: `${genre}/${level}/${section}`,
      reopenable: true,
    },
    afterReady: ({ stillCurrent }) => {
      if (!stillCurrent()) return;
      takePracticeTrack(genre, level, section);
    },
  });
}

async function prepareCollab(
  intent: Extract<OpenIntent, { kind: 'collab' }>,
  ctx: PrepareContext,
): Promise<PreparedOpen> {
  const jam = intent.jamImport ? readPendingJam() : null;
  if (intent.jamImport && !jam) {
    throw new OpenRefusal(notFoundError(NOT_FOUND_MESSAGES.jam));
  }
  const claim = await claimNew(ctx);
  const code = intent.code;
  const joinerId = code.trim().toLowerCase();
  const joiner = code !== 'new' && !intent.host;
  return seeded(claim, {
    apply: ({ collab }) => {
      if (code === 'new') {
        collab.createAndJoinRoom();
        return;
      }
      if (intent.host) {
        // The host brings the jam in, then seeds the shared doc with it.
        if (jam) applyJamSession(jam);
        collab.joinRoom(code, 'owner', undefined, `studio-${code}`, code);
        return;
      }
      if (intent.awaitHost) collab.joinRoomAwaitingHost(code);
      else collab.joinRoomById(code);
    },
    // A room is its own only copy: work to keep.
    savedComplete: false,
    baseline: {
      source: 'collab',
      ...(code === 'new' ? {} : { ref: joiner ? joinerId : code }),
      reopenable: false,
    },
    collabWait: joiner
      ? { roomId: joinerId, awaitHost: intent.awaitHost }
      : null,
    afterReady: ({ stillCurrent, draftWritten }) => {
      if (!stillCurrent()) return;
      if (code === 'new') {
        // Surface the room code: CollabToolbar owns the Invite modal.
        useStore.getState()._setInviteRequested(true);
      }
      if (jam && draftWritten) clearJamSession();
    },
  });
}
