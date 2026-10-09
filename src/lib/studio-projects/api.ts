import { showWarning } from '@/components/utils/toast';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import {
  serializeSessionForCloud,
  type CloudProjectInput,
} from '@/daw/persistence/SessionSerializer';
import {
  cloudSaveGaps,
  documentFingerprint,
  documentSnapshot,
  markDocumentBaseline,
  useSaveStatusStore,
  type DocumentSnapshot,
} from '@/daw/persistence/saveStatusStore';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useSessionStore } from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import type { AssetStamp } from '@/lib/studio-assets/upload-pending';
import { hashFingerprint } from './drafts/fingerprintHash';
import type { DraftCloudRecord } from './drafts/types';
import { PROJECT_SAVED_EVENT } from './projectEvents';
import {
  serverTimeIso,
  studioProjectsApi,
  type StudioProjectDetail,
} from './projectsClient';
import { isStudioApiError } from './studioApiError';

// The REST client and its shapes live in ./projectsClient, which has no DAW
// imports, so pages that only list projects don't load the save path.
export * from './projectsClient';

// ── The session a save is for (milestone 1.4) ──────────────────────────────

/**
 * The session a save was asked in: its generation, and the draft that holds
 * it on this device. A save checks the generation after every await. Once
 * another project has opened, nothing more of the save touches the store,
 * and whatever the cloud now holds of the outgoing session (a project
 * minted for it, the copy a PUT wrote) goes to that session's draft through
 * DraftSessionPort.patchCloud, so reopening the draft finds its cloud link.
 */
export interface SaveFence {
  generation: number;
  draftId: string | null;
}

/**
 * 'save' writes the session's own cloud project (minting it on the first
 * save, re-creating it when it was deleted elsewhere); 'saveAs' and 'asNew'
 * make a new project, and switch the session to it only once it succeeded.
 * 'saveAs' also renames the session to `nameOverride`.
 */
export type SaveMode = 'save' | 'saveAs' | 'asNew';

export interface FencedSaveOptions {
  fence: SaveFence;
  nameOverride?: string;
  mode: SaveMode;
  /**
   * The cloud link when the save was asked for (default: the link when this
   * runs). A plain save whose link changed meanwhile (File ▸ Delete, a Save
   * As) sends nothing: it would bring a deleted project back.
   */
  expectProjectId?: string | null;
}

/**
 * Why a save made its project again: deleted elsewhere (404/410), or one
 * this account can't write (403, e.g. a shared device's earlier student's).
 */
export type RecreateReason = 'deleted' | 'other-account';

export interface CloudSaveDone {
  status: 'saved';
  projectId: string;
  project: StudioProjectDetail;
  /** The cloud copy holds the whole document (and echoed it back intact). */
  complete: boolean;
  /** The PUT's answer didn't hold what was sent (tracks, settings, assets). */
  echoMismatch: boolean;
  /**
   * What the payload left out of the document it was taken from
   * (cloudSaveGaps names), for the toast: the save's own snapshot, not the
   * document as it is by the time the save finished.
   */
  gaps: readonly string[];
  /** The project had been deleted elsewhere (or was not this account's) and was made again. */
  recreated: boolean;
  recreatedReason: RecreateReason | null;
  /** A new project (Save As, a leave copy). */
  asCopy: boolean;
  /** Audio clips the save left out: their bytes couldn't be uploaded. */
  audioClipsLeftOut: number;
  /** Sampler samples saved without their audio. */
  samplerSamplesLeftOut: number;
  /** Clips whose reclaimed asset couldn't be re-uploaded (dropped). */
  unrecoverable: number;
  /** The document as the cloud copy holds it: a hashFingerprint and its version. */
  snapshot: { fingerprint: string; version: number };
  /** The server's updatedAt, ISO. */
  updatedAt: string | null;
  generation: number;
}

export type FencedSaveOutcome =
  | CloudSaveDone
  | {
      status: 'superseded';
      /** The cloud project the outgoing session reached, if any. */
      projectId: string | null;
      /** Whether its cloud link or record went to the outgoing draft. */
      routed: boolean;
    };

/** The draft the live session writes to, for a save to route to later. */
export function activeDraftIdForSave(): string | null {
  try {
    return (
      getSessionDeps()?.drafts.activeDraftId() ??
      useSessionStore.getState().draftId ??
      null
    );
  } catch {
    return useSessionStore.getState().draftId ?? null;
  }
}

// ── What a save sends ──────────────────────────────────────────────────────

/** The payload and the document it holds, captured in one synchronous step. */
interface SaveSnapshot {
  payload: CloudProjectInput;
  /** The payload as JSON, made on first use (only a first save compares). */
  readonly json: string;
  /** The document as it will stand once the save succeeds. */
  doc: DocumentSnapshot;
  /** What the payload leaves out of the document (cloudSaveGaps, legacy). */
  gaps: readonly string[];
  /** Nothing in it is left out of the payload. */
  complete: boolean;
}

/**
 * Capture what a save sends: the cloud payload under `nameOverride`, the
 * document snapshot (documentSnapshot) and what the payload leaves out of
 * it, all from one state. For a Save As, `renameTo` is the name the session
 * takes when the copy succeeds: the snapshot is the document under that
 * name, so the renamed session reads as saved.
 */
function captureSnapshot(
  nameOverride?: string,
  renameTo?: string,
): SaveSnapshot {
  const state = useStore.getState();
  const payload = serializeSessionForCloud(nameOverride);
  const doc: DocumentSnapshot =
    renameTo === undefined || renameTo === state.projectName
      ? documentSnapshot()
      : {
          version: useSaveStatusStore.getState().documentVersion,
          fingerprint: documentFingerprint({ ...state, projectName: renameTo }),
          projectId: state.projectId,
        };
  const gaps = cloudSaveGaps(state, 'legacy');
  let json: string | null = null;
  return {
    payload,
    get json() {
      return (json ??= JSON.stringify(payload));
    },
    doc,
    gaps,
    complete: gaps.length === 0,
  };
}

/**
 * The snapshot with every audio clip left out of its payload: what a
 * re-create POSTs before the audio is uploaded into the new project.
 * Complete only when there was no audio to leave out.
 */
function withoutAudio(snapshot: SaveSnapshot): SaveSnapshot {
  const hadAudio = snapshot.payload.tracks.some(
    (track) => track.audioClips.length > 0,
  );
  if (!hadAudio) return snapshot;
  const payload: CloudProjectInput = {
    ...snapshot.payload,
    tracks: snapshot.payload.tracks.map((track) => ({
      ...track,
      audioClips: [],
    })),
  };
  let json: string | null = null;
  return {
    payload,
    get json() {
      return (json ??= JSON.stringify(payload));
    },
    doc: snapshot.doc,
    gaps: snapshot.gaps,
    complete: false,
  };
}

/**
 * The draft's record of what a cloud row holds after a write: complete only
 * when the snapshot was, and the server's answer echoed it back intact.
 */
function cloudRecord(
  projectId: string,
  project: StudioProjectDetail,
  snapshot: SaveSnapshot,
): DraftCloudRecord {
  return {
    projectId,
    updatedAt: serverTimeIso(project.updatedAt),
    savedFingerprint: hashFingerprint(snapshot.doc.fingerprint),
    savedComplete: snapshot.complete && echoMatches(snapshot.payload, project),
    savedAt: Date.now(),
  };
}

/**
 * Hand what the cloud holds of an outgoing session to its draft. Returns
 * whether there was a draft to hand it to (no editor, no draft: nothing).
 */
function routeToDraft(
  draftId: string | null,
  patch: { projectId?: string; cloud?: DraftCloudRecord },
): boolean {
  if (!draftId) return false;
  const drafts = getSessionDeps()?.drafts;
  if (!drafts) return false;
  void drafts.patchCloud(draftId, patch).catch((err) => {
    console.warn('[studio-projects] could not note the save on its draft', err);
  });
  return true;
}

/**
 * Delete a project this module made that nobody will use: a Save As copy
 * whose save then failed, a re-created project the student deleted
 * meanwhile. Best effort, never awaited by the student's path; a failure is
 * only logged (the row stays in their account).
 */
function discardProject(token: string, projectId: string): void {
  void studioProjectsApi.remove(token, projectId).catch((err) => {
    console.warn('[studio-projects] could not remove an unused copy', err);
  });
}

// ── Request timeouts ───────────────────────────────────────────────────────

/**
 * How long one save request (POST, PUT, the gone check) may take. Saves run
 * one at a time, so a request that never answers (Wi-Fi gone without a
 * reset) would hold every later save: it fails instead, and the student
 * gets Retry.
 */
export const SAVE_REQUEST_TIMEOUT_MS = 45_000;

/**
 * Run `run` with a signal that aborts after `ms`, and reject with a
 * TimeoutError then even if the request ignores its signal.
 */
async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms = SAVE_REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new DOMException(
        'The save request timed out',
        'TimeoutError',
      );
      controller.abort(error);
      reject(error);
    }, ms);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ── Save bookkeeping ───────────────────────────────────────────────────────

/**
 * Count a save-path request saveProject doesn't count itself (a deprecated
 * save, a collab take's mint) in useCloudSaveStore.inFlight, so an open's
 * "settle saves" wait (whenSavesSettled) covers it too.
 */
function countInFlight<T>(promise: Promise<T>): Promise<T> {
  useCloudSaveStore.setState((s) => ({ inFlight: s.inFlight + 1 }));
  return promise.finally(() => {
    useCloudSaveStore.setState((s) => ({
      inFlight: Math.max(0, s.inFlight - 1),
    }));
  });
}

// Where this page's own saves moved the session's cloud link within one
// session generation (a Save As to its copy, a re-create to the new
// project), from → to. A plain save asked before the move still saves the
// session: it follows the moves to the current link. A link cleared or
// changed by anything else (File ▸ Delete) is not here, and stops it.
let linkMoves: { generation: number; moves: Map<string, string> } = {
  generation: -1,
  moves: new Map(),
};

function recordLinkMove(
  generation: number,
  from: string | null,
  to: string,
): void {
  if (from === null || from === to) return;
  if (linkMoves.generation !== generation) {
    linkMoves = { generation, moves: new Map() };
  }
  linkMoves.moves.set(from, to);
}

/** Where `projectId` ended up after this page's own moves, in `generation`. */
function followLinkMoves(generation: number, projectId: string): string {
  if (linkMoves.generation !== generation) return projectId;
  let id = projectId;
  const seen = new Set<string>();
  while (linkMoves.moves.has(id) && !seen.has(id)) {
    seen.add(id);
    id = linkMoves.moves.get(id)!;
  }
  return id;
}

// ── Minting a project ──────────────────────────────────────────────────────

interface MintResult {
  id: string;
  /** This caller's own create: it knows what the POST carried. */
  mine: boolean;
  detail?: StudioProjectDetail;
  snapshot?: SaveSnapshot;
}

// Guards against two concurrent first-saves (e.g. a take's upload in a
// collab room firing at the same moment the user hits Save) each POSTing a
// fresh project. Whoever wins the race mints the id; everyone else in the
// same session generation awaits the same promise. A caller in a later
// generation (another project opened while the create was out) mints its
// own. Save As and a leave copy never join it: they make a project of their
// own.
let projectCreateInFlight: {
  generation: number;
  promise: Promise<MintResult>;
} | null = null;

async function mintProject(
  token: string,
  nameOverride?: string,
): Promise<MintResult> {
  const generation = getSessionGeneration();
  if (projectCreateInFlight?.generation === generation) {
    const shared = await projectCreateInFlight.promise;
    return { id: shared.id, mine: false };
  }

  // Room membership, not socket state: a draft minted while reconnecting still
  // belongs to the session. Read before the create, so a draft started for
  // solo work just before a join is never mistaken for a session draft.
  const roomAtMint = useStore.getState().roomId;
  const draftId = activeDraftIdForSave();

  const promise = (async (): Promise<MintResult> => {
    const snapshot = captureSnapshot(nameOverride);
    const created = await withTimeout((signal) =>
      studioProjectsApi.create(token, snapshot.payload, { signal }),
    );
    if (getSessionGeneration() === generation) {
      const state = useStore.getState();
      // A copy that finished meanwhile (Save As) already linked the session.
      if (state.projectId === null) {
        state.setProjectId(created.id);
        if (roomAtMint && state.roomId === roomAtMint) {
          state._setSessionDraftProjectId(created.id);
        }
      }
    } else {
      // Minted for a session that has gone: its draft keeps the link.
      routeToDraft(draftId, {
        projectId: created.id,
        cloud: cloudRecord(created.id, created, snapshot),
      });
    }
    return { id: created.id, mine: true, detail: created, snapshot };
  })();
  const inFlight = { generation, promise };
  projectCreateInFlight = inFlight;

  try {
    return await promise;
  } finally {
    if (projectCreateInFlight === inFlight) projectCreateInFlight = null;
  }
}

/**
 * Return the current cloud project id, minting the project (audio-less) if it
 * doesn't exist yet. Audio clips without an assetId are dropped from the create
 * payload (they're uploaded separately).
 *
 * Concurrency-safe: simultaneous callers share a single create request.
 *
 * The new id is stamped on the session only while it is the one the create
 * was made for: once another project has opened (a new session generation),
 * the id goes to the outgoing session's draft (DraftSessionPort.patchCloud)
 * and is only returned. The create counts as a save in flight, so an open
 * waits for it.
 *
 * A project minted during a collab session is recorded as the session's draft:
 * the only project the leave prompt's "Discard this session's changes" may
 * delete, and only if the session started from an empty project (see
 * LeaveSavePrompt). Since milestone 1.4 only a Save, a take or sample drop
 * in a collab room, and one the device's draft can't hold mint; other solo
 * takes wait for the first Save.
 */
export async function ensureProjectId(
  token: string,
  nameOverride?: string,
): Promise<string> {
  const existing = useStore.getState().projectId;
  if (existing) return existing;
  return (await countInFlight(mintProject(token, nameOverride))).id;
}

// ── Saving ─────────────────────────────────────────────────────────────────

/**
 * A save that stopped before its PUT, because the session it was for had
 * gone: another project opened, or this one was deleted or saved as a new
 * copy, while the save waited for the one before it, for its project to be
 * minted or for its uploads. Nothing of what is open now was sent (a first
 * save's new project holds the session as it was when it was minted).
 * saveProject's failure for a save fenced out before it began (its
 * outcome 'superseded'); callers may let it pass quietly: what is open now
 * was never asked to be saved.
 */
export class SaveSupersededError extends Error {
  constructor() {
    super(
      'the project was closed, deleted or saved as a copy before it could be sent',
    );
    this.name = 'SaveSupersededError';
  }
}

/** A request saveNow runs: what it was asked to save, as it was asked. */
interface SaveRequest {
  token: string;
  nameOverride?: string;
  mode: SaveMode;
  fence: SaveFence;
  /** The cloud link when it was asked; null for a first save. */
  projectId: string | null;
}

// The save running now, or the last one to finish. Cmd-S, File ▸ Save, Save
// As and the leave prompt can each start a save while another is still
// uploading; run side by side, an older PUT that finished last would put the
// older project in the cloud and mark it saved over the newer one. So each
// save waits for the one before it, whether that succeeded or failed.
let saveQueue: Promise<unknown> = Promise.resolve();

/** How long a 5xx PUT waits before its one retry. */
export const PUT_RETRY_DELAY_MS = 400;

/**
 * Save the current store state to the cloud, including uploading any in-memory
 * audio clips that don't yet have an assetId (saveProject's path, milestone
 * 1.4), as spec section 6:
 *   1. Create the project when needed: a first save mints it (shared with a
 *      collab take's upload, ensureProjectId); Save As and a leave copy POST
 *      a new project of their own and touch the session's link only once
 *      they succeed.
 *   2. Upload pending audio, stamping assetIds only in the save's session
 *      and while its link is the one uploaded to.
 *   3. reconcileMissingAssets.
 *   4. Snapshot: the payload and the document (documentSnapshot) in one
 *      step, and what the payload leaves out (cloudSaveGaps).
 *   5. PUT, unless the POST already carried this very snapshot. A 5xx is
 *      retried once; a POST never is. Each request times out (45 s).
 *      In 'save' mode a project that is gone (PUT 404/410, or uploads that
 *      fail where a GET then says 404/410) or belongs to another account
 *      (403) is made again under its name, and steps 2-5 run again against
 *      the new project.
 *   6. After every await: has another project opened? Then nothing more
 *      touches the store; what the cloud holds goes to the outgoing draft,
 *      and the outcome is 'superseded'.
 *   7. Switch the session to the copy (Save As, a leave copy), and mark the
 *      snapshot as its baseline (markDocumentBaseline with the snapshot: an
 *      edit made while the request was out still reads unsaved). A copy
 *      whose save failed is removed again, and its stamps undone.
 *   8. The PUT's echo: tracks, settings keys or assetIds that came back
 *      different make the save incomplete.
 *   9. Collab's _markSessionSaved and the PROJECT_SAVED_EVENT event
 *      {projectId, generation}.
 * It never toasts; it resolves 'saved' or 'superseded', and throws a
 * StudioApiError, a TimeoutError or an upload error on failure.
 *
 * Saves run one at a time, in the order they were asked for (see saveQueue).
 */
export function saveCurrentProjectToCloud(
  token: string,
  options: FencedSaveOptions,
): Promise<FencedSaveOutcome> {
  const request: SaveRequest = {
    token,
    nameOverride: options.nameOverride,
    mode: options.mode,
    fence: options.fence,
    projectId:
      options.expectProjectId !== undefined
        ? options.expectProjectId
        : useStore.getState().projectId,
  };
  const promise = saveQueue.then(() => saveNow(request));
  saveQueue = promise.catch(() => undefined);
  return promise;
}

/** Thrown inside saveNow when the session went during the PUT's retry wait. */
const RETRY_SUPERSEDED = Symbol('retry-superseded');

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Audio the session holds whose bytes never reached the cloud. */
function pendingAudio(): { clips: number; samples: number } {
  let clips = 0;
  let samples = 0;
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) if (!clip.assetId) clips++;
    const sample = track.samplerSample;
    if (sample && !sample.assetId && !sample.sourceUrl) samples++;
  }
  return { clips, samples };
}

/**
 * Why a save in 'save' mode should make its project again, from a failed
 * request: 'deleted' (404/410: deleted elsewhere) or 'other-account' (403:
 * a project this account can't write, such as one a shared device's earlier
 * student saved), or null.
 */
function recreateReason(err: unknown): RecreateReason | null {
  if (!isStudioApiError(err)) return null;
  if (err.status === 404 || err.status === 410) return 'deleted';
  if (err.status === 403) return 'other-account';
  return null;
}

/**
 * After uploads failed, whether that is because the project itself is gone:
 * a GET of it answers 404/410 (or 403). Anything else, including a failed
 * check, says no, and the upload failure stands.
 */
async function projectGone(
  token: string,
  projectId: string,
): Promise<RecreateReason | null> {
  try {
    await withTimeout((signal) =>
      studioProjectsApi.get(token, projectId, { signal }),
    );
    return null;
  } catch (err) {
    return recreateReason(err);
  }
}

async function saveNow(request: SaveRequest): Promise<FencedSaveOutcome> {
  const { token, nameOverride, mode, fence } = request;
  const { generation } = fence;
  // Lazy import to avoid pulling the AudioBufferStore + WAV encoder into the
  // module graph for callers that don't need them (e.g. cmd-S handler binding).
  const assets = await import('@/lib/studio-assets/upload-pending');
  const { uploadPendingAudioClips, reconcileMissingAssets } = assets;

  // The fence is the session generation alone, not the room too (decided in
  // the 1.4 integration, contracts R10.2): every room change that replaces
  // the project goes through openSession and bumps it (a Join, Leave & new
  // project). The ones that don't keep the same project and link in the
  // store: creating a room shares the open project, and a kick or the host
  // leaving tears the room down with the project still loaded, so a save
  // asked before them still writes the project the student asked to save,
  // into its own row (stillOpen also checks the link).
  const inSession = () => getSessionGeneration() === generation;
  const link = () => useStore.getState().projectId;
  const superseded = (
    projectId: string | null = null,
    routed = false,
  ): FencedSaveOutcome => ({ status: 'superseded', projectId, routed });

  // The session it was asked for has gone while it waited its turn: another
  // project opened, or this one's cloud link was let go of (File ▸ Delete).
  // A first save (no link yet) takes the link a save before it minted; a
  // link this page's own save moved (Save As, a re-create) is followed.
  if (!inSession()) return superseded();
  if (mode === 'save' && request.projectId !== null) {
    const current = link();
    if (
      current !== request.projectId &&
      (current === null ||
        followLinkMoves(generation, request.projectId) !== current)
    ) {
      return superseded();
    }
  }

  const asCopy = mode !== 'save';
  const renameTo = mode === 'saveAs' ? nameOverride : undefined;
  let projectId: string;
  // The create this save made itself, and what its POST carried.
  let created: { detail: StudioProjectDetail; snapshot: SaveSnapshot } | null =
    null;
  // A copy's stamps: undone if its save fails (the copy is removed).
  const stamps: AssetStamp[] = [];
  const onStamp = asCopy
    ? (stamp: AssetStamp) => void stamps.push(stamp)
    : undefined;

  if (asCopy) {
    const snapshot = captureSnapshot(nameOverride, renameTo);
    const detail = await withTimeout((signal) =>
      studioProjectsApi.create(token, snapshot.payload, { signal }),
    );
    projectId = detail.id;
    created = { detail, snapshot };
  } else {
    const existing = link();
    if (existing) {
      projectId = existing;
    } else {
      const minted = await mintProject(token, nameOverride);
      // A mint for a session that has gone has told its draft itself.
      if (!inSession()) return superseded(minted.id, minted.mine);
      projectId = minted.id;
      if (minted.mine && minted.detail && minted.snapshot) {
        created = { detail: minted.detail, snapshot: minted.snapshot };
      }
    }
  }

  try {
    return await finishSave();
  } catch (err) {
    // A copy that never became the session's project: undo its stamps, so
    // its clips stay pending (their bytes in the draft), and remove it.
    if (asCopy && created) {
      if (stamps.length > 0) assets.revertAssetStamps(stamps, { generation });
      discardProject(token, created.detail.id);
    }
    throw err;
  }

  async function finishSave(): Promise<FencedSaveOutcome> {
    /** The session gone after the create: a copy's project goes to its draft. */
    const goneAfterCreate = (): FencedSaveOutcome => {
      if (!inSession() && asCopy && created) {
        const routed = routeToDraft(fence.draftId, {
          projectId,
          cloud: cloudRecord(projectId, created.detail, created.snapshot),
        });
        return superseded(projectId, routed);
      }
      return superseded(projectId);
    };
    // Whether the session this save is for is still open, linked to the row
    // it writes (a copy: still the session it was asked in). Checked again
    // after every await that can let the student act.
    const stillOpen = () => inSession() && (asCopy || link() === projectId);
    // The fence of an upload's stamps: this session, linked as it is now.
    const uploadFence = () => ({ generation, projectId: link() });

    let recreated: RecreateReason | null = null;
    let unrecoverable = 0;
    let sent: SaveSnapshot;
    let result: StudioProjectDetail;

    /**
     * Make the project again under its name (it was deleted elsewhere, or
     * belongs to another account), and point the session at it. Returns an
     * outcome when the save must stop, or null to run steps 2-5 again
     * against the new project.
     */
    const recreate = async (
      reason: RecreateReason,
    ): Promise<FencedSaveOutcome | null> => {
      if (!stillOpen()) return superseded(projectId);
      // Without its audio: the clips' assets may have gone with the old
      // project (a create naming them would be refused). The next round
      // uploads and reconciles them into the new project, then PUTs.
      const again = withoutAudio(captureSnapshot(nameOverride));
      const detail = await withTimeout((signal) =>
        studioProjectsApi.create(token, again.payload, { signal }),
      );
      if (!inSession()) {
        const routed = routeToDraft(fence.draftId, {
          projectId: detail.id,
          cloud: cloudRecord(detail.id, detail, again),
        });
        return superseded(detail.id, routed);
      }
      // File ▸ Delete (or a Save As) while it was out: the session let go.
      if (link() !== projectId) {
        discardProject(token, detail.id);
        return superseded(detail.id);
      }
      useStore.getState().setProjectId(detail.id);
      recordLinkMove(generation, projectId, detail.id);
      projectId = detail.id;
      created = { detail, snapshot: again };
      recreated = reason;
      return null;
    };

    for (;;) {
      if (!stillOpen()) return goneAfterCreate();
      const canRecreate = mode === 'save' && recreated === null;

      // Pending = never-uploaded bytes: audio clips without an assetId, and
      // sampler one-shots that are neither uploaded nor bundled (sourceUrl).
      const before = pendingAudio();
      let uploaded = 0;
      if (before.clips + before.samples > 0) {
        try {
          await uploadPendingAudioClips(token, projectId, {
            fence: uploadFence(),
            onStamp,
          });
        } catch (err) {
          if (!stillOpen()) return goneAfterCreate();
          // Uploads into a project deleted elsewhere fail: make it again,
          // and upload into the new one.
          const reason = canRecreate
            ? await projectGone(token, projectId)
            : null;
          if (reason === null) throw err;
          const stop = await recreate(reason);
          if (stop) return stop;
          continue;
        }
        if (!stillOpen()) return goneAfterCreate();
        const after = pendingAudio();
        uploaded =
          before.clips + before.samples - (after.clips + after.samples);
      }

      // Close the collab race where a referenced asset was reclaimed by
      // another participant leaving without saving: re-upload from this
      // user's in-memory buffer where possible, and drop the references
      // whose bytes are truly gone (alerted) so they don't fail the save on
      // a dangling reference.
      const reconciled = await reconcileMissingAssets(token, projectId, {
        fence: uploadFence(),
        onStamp,
      });
      const reuploaded = reconciled.reuploaded ?? 0;
      const reuploadFailed = reconciled.reuploadFailed ?? 0;
      unrecoverable += reconciled.unrecoverable ?? 0;

      // The uploads gave the student time to open another project, delete
      // this one or save it as a copy. The PUT would then write whatever is
      // open now into this row, and mark it saved: send nothing.
      if (!stillOpen()) return goneAfterCreate();

      // Re-uploads that failed (their clips are pending again, the bytes
      // still here): when the project itself is gone, make it again.
      if (canRecreate && reuploadFailed > 0) {
        const reason = await projectGone(token, projectId);
        if (reason !== null) {
          const stop = await recreate(reason);
          if (stop) return stop;
          continue;
        }
        if (!stillOpen()) return goneAfterCreate();
      }

      // Final write with the up-to-date payload (post-upload assetIds
      // included), captured with the document it holds (one synchronous
      // step).
      const snapshot = captureSnapshot(nameOverride, renameTo);
      const made = created;
      const postCarriedIt =
        made !== null &&
        uploaded === 0 &&
        reuploaded === 0 &&
        reuploadFailed === 0 &&
        (reconciled.unrecoverable ?? 0) === 0 &&
        made.snapshot.doc.fingerprint === snapshot.doc.fingerprint &&
        made.snapshot.json === snapshot.json;

      if (made !== null && postCarriedIt) {
        result = made.detail;
        sent = made.snapshot;
        break;
      }
      try {
        result = await putWithRetry(
          token,
          projectId,
          snapshot.payload,
          stillOpen,
        );
        sent = snapshot;
        break;
      } catch (err) {
        if (err === RETRY_SUPERSEDED) return goneAfterCreate();
        const reason = canRecreate ? recreateReason(err) : null;
        if (reason === null) throw err;
        // Deleted elsewhere (another tab or device), or not this account's:
        // make it again under its name. The link moves only once the new
        // project exists.
        const stop = await recreate(reason);
        if (stop) return stop;
      }
    }

    // The PUT's echo: what came back must hold what was sent.
    const echoMismatch = !echoMatches(sent.payload, result);
    const complete = sent.complete && !echoMismatch;
    const done = (): CloudSaveDone => {
      // Any clip still missing an assetId here is one whose audio bytes are
      // no longer in memory (or an upload that kept failing): the saved
      // project left it out. Reclaimed-asset clips were counted apart.
      const left = pendingAudio();
      const audioClipsLeftOut = Math.max(0, left.clips - unrecoverable);
      return {
        status: 'saved',
        projectId,
        project: result,
        complete,
        echoMismatch,
        gaps: sent.gaps,
        recreated: recreated !== null,
        recreatedReason: recreated,
        asCopy,
        audioClipsLeftOut,
        samplerSamplesLeftOut: left.samples,
        unrecoverable,
        snapshot: {
          fingerprint: hashFingerprint(sent.doc.fingerprint),
          version: sent.doc.version,
        },
        updatedAt: serverTimeIso(result.updatedAt),
        generation,
      };
    };

    // The session went while the request was out: the row is saved all the
    // same; its draft learns what the cloud holds now, and nothing here
    // touches what is open.
    if (!inSession()) {
      const routed = routeToDraft(fence.draftId, {
        projectId,
        cloud: cloudRecord(projectId, result, sent),
      });
      return superseded(projectId, routed);
    }
    // The session let go of this row meanwhile (File ▸ Delete).
    if (!asCopy && link() !== projectId) {
      return superseded(projectId);
    }

    if (asCopy) {
      const state = useStore.getState();
      if (renameTo !== undefined && state.projectName !== renameTo) {
        state.setProjectName(renameTo);
      }
      recordLinkMove(generation, state.projectId, projectId);
      state.setProjectId(projectId);
    }

    // The cloud holds the project as it was sent: that is its saved state
    // now, whole or in part (D7). An edit made while the request was out
    // isn't in it, so it still reads unsaved; a newer baseline outranks this
    // one.
    markDocumentBaseline({
      snapshot: { ...sent.doc, projectId },
      savedComplete: complete,
    });

    // In a collab session, record that a save happened so the leave flow
    // won't reclaim this project as an "unsaved draft" (see LeaveSavePrompt).
    if (useStore.getState().isCollabActive) {
      useStore.getState()._markSessionSaved();
    }

    // A saved project is the moment to ask whether the set lists carrying
    // this lead sheet should get the new version (see SetListUpdatePrompt).
    window.dispatchEvent(
      new CustomEvent(PROJECT_SAVED_EVENT, {
        detail: { projectId, generation },
      }),
    );

    return done();
  }
}

/**
 * The audio a save left out, as today's warnings: never let a save that
 * dropped audio pass as a clean one.
 */
export function warnAudioLeftOut(clips: number, samples: number): void {
  if (clips > 0) {
    showWarning(
      `${clips} audio clip(s) could not be uploaded and were left out of the saved project.`,
    );
  }
  // A sampler sample still without an assetId (and not a bundled sourceUrl
  // sample) saved only its metadata: the audio won't restore on reload or on
  // other devices.
  if (samples > 0) {
    showWarning(
      `${samples} sampler sample(s) could not be uploaded — they will play locally but won't restore after a reload.`,
    );
  }
}

/**
 * PUT, retried once on a 5xx (the same payload: one snapshot). Each try
 * times out (SAVE_REQUEST_TIMEOUT_MS).
 */
async function putWithRetry(
  token: string,
  projectId: string,
  payload: CloudProjectInput,
  stillOpen: () => boolean,
): Promise<StudioProjectDetail> {
  const put = () =>
    withTimeout((signal) =>
      studioProjectsApi.update(token, projectId, payload, { signal }),
    );
  try {
    return await put();
  } catch (err) {
    if (!isStudioApiError(err) || err.status < 500) throw err;
    await delay(PUT_RETRY_DELAY_MS);
    if (!stillOpen()) throw RETRY_SUPERSEDED;
    return put();
  }
}

/** The keys of `value` that hold something (JSON drops undefined). */
function definedKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k)
    .sort();
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Whether the server's answer holds what was sent: as many tracks, each
 * with the same settings keys and the same assetIds. An answer without
 * tracks says nothing and passes (the owner's contract (c) has the PUT echo
 * them; checked at runtime until confirmed).
 */
export function echoMatches(sent: CloudProjectInput, answer: unknown): boolean {
  if (!answer || typeof answer !== 'object') return true;
  const tracks = (answer as { tracks?: unknown }).tracks;
  if (!Array.isArray(tracks)) return true;
  if (tracks.length !== sent.tracks.length) return false;
  const echoed = tracks
    .map((track, index) => ({ track: track as Record<string, unknown>, index }))
    .sort((a, b) => {
      const ao =
        typeof a.track?.ordinal === 'number' ? a.track.ordinal : a.index;
      const bo =
        typeof b.track?.ordinal === 'number' ? b.track.ordinal : b.index;
      return ao - bo;
    })
    .map(({ track }) => track);
  for (let i = 0; i < sent.tracks.length; i++) {
    const mine = sent.tracks[i];
    const theirs = echoed[i] ?? {};
    const sentKeys = definedKeys(mine.settings);
    if (
      sentKeys.length > 0 &&
      !sameList(sentKeys, definedKeys(theirs.settings))
    ) {
      return false;
    }
    const sentAssets = mine.audioClips.map((clip) => clip.assetId).sort();
    const theirClips = Array.isArray(theirs.audioClips)
      ? theirs.audioClips
      : [];
    const theirAssets = theirClips
      .map((clip) => String((clip as { assetId?: unknown }).assetId))
      .sort();
    if (!sameList(sentAssets, theirAssets)) return false;
  }
  return true;
}
