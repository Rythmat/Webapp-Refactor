import { showError, showWarning } from '@/components/utils/toast';
import { serializeSessionForCloud } from '@/daw/persistence/SessionSerializer';
import {
  cloudSaveGaps,
  documentSnapshot,
  markDocumentBaseline,
  type DocumentSnapshot,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { studioProjectsApi, type StudioProjectDetail } from './projectsClient';

// The REST client and its shapes live in ./projectsClient, which has no DAW
// imports, so pages that only list projects don't load the save path.
export * from './projectsClient';

// Guards against two concurrent first-saves (e.g. an upload-on-record firing at
// the same moment the user hits Save) each POSTing a fresh project. Whoever
// wins the race mints the id; everyone else in the same session generation
// awaits the same promise. A caller in a later generation (another project
// opened while the create was out) mints its own.
let projectCreateInFlight: {
  generation: number;
  promise: Promise<string>;
} | null = null;

/**
 * Return the current cloud project id, minting the project (audio-less) if it
 * doesn't exist yet. Audio clips without an assetId are dropped from the create
 * payload (they're uploaded separately), so this is safe to call the moment a
 * recording finishes — before any audio has an assetId.
 *
 * Concurrency-safe: simultaneous callers share a single create request.
 *
 * The new id is stamped on the session only while it is the one the create
 * was made for: once another project has opened (a new session generation),
 * the row holds the project that was open, and the id is only returned.
 *
 * A project minted during a collab session is recorded as the session's draft:
 * the only project the leave prompt's "Discard this session's changes" may
 * delete, and only if the session started from an empty project (see
 * LeaveSavePrompt).
 */
export async function ensureProjectId(
  token: string,
  nameOverride?: string,
): Promise<string> {
  const existing = useStore.getState().projectId;
  if (existing) return existing;
  const generation = getSessionGeneration();
  if (projectCreateInFlight?.generation === generation) {
    return projectCreateInFlight.promise;
  }

  // Room membership, not socket state: a draft minted while reconnecting still
  // belongs to the session. Read before the create, so a draft started for
  // solo work just before a join is never mistaken for a session draft.
  const roomAtMint = useStore.getState().roomId;

  const promise = (async () => {
    const created = await studioProjectsApi.create(
      token,
      serializeSessionForCloud(nameOverride),
    );
    if (getSessionGeneration() === generation) {
      const state = useStore.getState();
      state.setProjectId(created.id);
      if (roomAtMint && state.roomId === roomAtMint) {
        state._setSessionDraftProjectId(created.id);
      }
    }
    return created.id;
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
 * A save that stopped before its PUT, because the session it was for had
 * gone: another project opened, or this one was deleted or saved as a new
 * copy, while the save waited for the one before it, for its project to be
 * minted or for its uploads. Nothing of what is open now was sent (a first
 * save's new project holds the session as it was when it was minted).
 * Callers may let it pass quietly: what is open now was never asked to be
 * saved, and when another project opened, the save has told the student
 * itself (supersededSave).
 */
export class SaveSupersededError extends Error {
  constructor() {
    super(
      'the project was closed, deleted or saved as a copy before it could be sent',
    );
    this.name = 'SaveSupersededError';
  }
}

/** What a save was asked to save, as it stood when it was asked. */
interface SaveRequest {
  /** The newest token any request it stands for brought. */
  token: string;
  nameOverride?: string;
  /** The session it was asked in (getSessionGeneration). */
  generation: number;
  /** The cloud project it was asked for; null for a first save. */
  projectId: string | null;
}

// The save running now, or the last one to finish. Cmd-S, File ▸ Save, Save
// As and the leave prompt can each start a save while another is still
// uploading; run side by side, an older PUT that finished last would put the
// older project in the cloud and mark it saved over the newer one. So each
// save waits for the one before it, whether that succeeded or failed.
let saveQueue: Promise<unknown> = Promise.resolve();

// The save waiting its turn, if any. It reads the project only when it
// starts, so a request for the same project that arrives meanwhile (Cmd-S
// pressed again during a long upload) joins it rather than queueing a save
// of its own.
let waitingSave: {
  request: SaveRequest;
  promise: Promise<StudioProjectDetail>;
} | null = null;

/**
 * Save the current store state to the cloud, including uploading any in-memory
 * audio clips that don't yet have an assetId.
 *
 * Recorded clips are normally uploaded the instant recording stops (see
 * uploadRecordedClip), so by Save time they usually already carry an assetId.
 * This still re-uploads anything left pending (e.g. imported clips, or a
 * recording whose immediate upload failed) as a safety net.
 *
 * Shapes the save as:
 *   1. Ensure the project exists (mint the id if this is the first save).
 *   2. Upload any pending audio clips, stamping their assetId onto the store.
 *   3. PUT the now-complete state.
 *   4. Mark it as the project's saved state (markDocumentBaseline).
 *
 * Saves run one at a time, in the order they were asked for (see saveQueue),
 * and a request for the same project as the save still waiting joins it. A
 * save is for the session open when it was asked: if that session has gone
 * by the time the save would send it, nothing is sent and the save rejects
 * with SaveSupersededError.
 * Shared by the File menu Save button and the Cmd-S keyboard shortcut.
 */
export function saveCurrentProjectToCloud(
  token: string,
  nameOverride?: string,
): Promise<StudioProjectDetail> {
  const request: SaveRequest = {
    token,
    nameOverride,
    generation: getSessionGeneration(),
    projectId: useStore.getState().projectId,
  };
  const waiting = waitingSave;
  if (
    waiting !== null &&
    waiting.request.generation === request.generation &&
    waiting.request.projectId === request.projectId &&
    waiting.request.nameOverride === request.nameOverride
  ) {
    waiting.request.token = token;
    return waiting.promise;
  }
  const entry: NonNullable<typeof waitingSave> = {
    request,
    promise: saveQueue.then(() => {
      if (waitingSave === entry) waitingSave = null;
      return saveNow(entry.request);
    }),
  };
  waitingSave = entry;
  saveQueue = entry.promise.catch(() => undefined);
  return entry.promise;
}

/** A save stopped once the session it was for had gone. */
const SUPERSEDED_NOTICE =
  "Your save didn't finish: another project was opened first. Your unsaved work was kept on this device.";

/**
 * The error a save stops with when its session has gone (SaveSupersededError).
 * When another project opened in its place, the student is told: they asked
 * for the save and believe it happened, while the cloud copy is as it was, and
 * their work is in a kept slot (replaceSession) that later work can push out.
 * A cloud link the session let go of (File ▸ Delete, Save As) was the
 * student's own doing, and goes unsaid.
 */
function supersededSave(generation: number): SaveSupersededError {
  if (getSessionGeneration() !== generation) showWarning(SUPERSEDED_NOTICE);
  return new SaveSupersededError();
}

async function saveNow(request: SaveRequest): Promise<StudioProjectDetail> {
  const { token, nameOverride, generation } = request;
  // Lazy import to avoid pulling the AudioBufferStore + WAV encoder into the
  // module graph for callers that don't need them (e.g. cmd-S handler binding).
  const { uploadPendingAudioClips, reconcileMissingAssets } = await import(
    '@/lib/studio-assets/upload-pending'
  );

  // The session it was asked for has gone while it waited its turn: another
  // project opened, or this one's cloud link changed (File ▸ Delete, Save
  // As). A first save (no link yet) takes the link a save before it minted.
  if (
    getSessionGeneration() !== generation ||
    (request.projectId !== null &&
      useStore.getState().projectId !== request.projectId)
  ) {
    throw supersededSave(generation);
  }

  const projectId = await ensureProjectId(token, nameOverride);
  // Whether the session this save is for is still open, linked to the row it
  // writes. Checked again after every await that can let the student act.
  const stillOpen = () =>
    getSessionGeneration() === generation &&
    useStore.getState().projectId === projectId;
  if (!stillOpen()) throw supersededSave(generation);

  // Pending = never-uploaded bytes: audio clips without an assetId, and
  // sampler one-shots that are neither uploaded nor bundled (sourceUrl).
  const hasPendingAudio = useStore
    .getState()
    .tracks.some(
      (t) =>
        t.audioClips.some((c) => !c.assetId) ||
        (t.samplerSample &&
          !t.samplerSample.assetId &&
          !t.samplerSample.sourceUrl),
    );
  if (hasPendingAudio) {
    await uploadPendingAudioClips(token, projectId);
  }

  // Close the collab race where a referenced asset was reclaimed by another
  // participant leaving without saving: re-upload from this user's in-memory
  // buffer where possible, and drop the references whose bytes are truly gone
  // (alerted below) so they don't fail the save on a dangling reference.
  const { unrecoverable } = await reconcileMissingAssets(token, projectId);
  if (unrecoverable > 0) {
    showError(
      `${unrecoverable} audio recording(s) could no longer be found and were removed from the saved project.`,
    );
  }

  // The uploads gave the student time to open another project, delete this
  // one or save it as a copy. The PUT would then write whatever is open now
  // into this row, and mark it saved: send nothing.
  if (!stillOpen()) throw supersededSave(generation);

  // Final write with the up-to-date payload (post-upload assetIds included).
  // The document is captured with it, against the row it is written to: an
  // edit made while the request is in flight isn't in the cloud, so it must
  // still count as unsaved work, and a session that lets go of this row
  // meanwhile is not marked saved by it.
  const sent: DocumentSnapshot = { ...documentSnapshot(), projectId };
  // Today's payload has no place for the chord lane, the mode, the metre,
  // markers, mastering, the Score and Lead Sheet, the Prism progression and
  // the rest of what only milestone 1.5's document field carries. A project
  // that holds any of it is saved only in part, so it stays work to keep: a
  // link that replaced it as saved would lose what the cloud copy lacks (D7).
  const complete = cloudSaveGaps(useStore.getState(), 'legacy').length === 0;
  const result = await studioProjectsApi.update(
    token,
    projectId,
    serializeSessionForCloud(nameOverride),
  );
  // The cloud holds the project as it was sent: that is its saved state now,
  // whole or in part. (A newer load or save since then outranks it.)
  markDocumentBaseline({ snapshot: sent, savedComplete: complete });

  // What follows is about the session that was saved. When it went while
  // the request was out, the row is saved all the same, and nothing here
  // concerns what is open now.
  if (!stillOpen()) return result;

  // In a collab session, record that a save happened so the leave flow won't
  // reclaim this project as an "unsaved draft" (see LeaveSavePrompt).
  if (useStore.getState().isCollabActive) {
    useStore.getState()._markSessionSaved();
  }

  // A saved project is the moment to ask whether the set lists carrying this
  // lead sheet should get the new version (see SetListUpdatePrompt). Fired
  // here so every save path — File menu, Save As, cmd-S, leave prompt — asks.
  window.dispatchEvent(
    new CustomEvent('ma-studio-project-saved', { detail: { projectId } }),
  );

  // Any clip still missing an assetId here is one whose audio bytes are no
  // longer in memory (e.g. recorded before this build, or an upload that kept
  // failing) — it was just dropped from the saved project. Don't let that pass
  // silently as a clean save. Exclude the reclaimed-asset clips already alerted
  // above so we don't double-report them.
  const unsavedAudioClips =
    useStore
      .getState()
      .tracks.flatMap((t) => t.audioClips)
      .filter((c) => !c.assetId).length - unrecoverable;
  if (unsavedAudioClips > 0) {
    showWarning(
      `${unsavedAudioClips} audio clip(s) could not be uploaded and were left out of the saved project.`,
    );
  }

  // Same honesty for sampler one-shots: a sample that still has no assetId
  // (and isn't a bundled sourceUrl sample) saved only its metadata — the
  // audio won't restore on reload or on other devices.
  const unsavedSamplerSamples = useStore
    .getState()
    .tracks.filter(
      (t) =>
        t.samplerSample &&
        !t.samplerSample.assetId &&
        !t.samplerSample.sourceUrl,
    ).length;
  if (unsavedSamplerSamples > 0) {
    showWarning(
      `${unsavedSamplerSamples} sampler sample(s) could not be uploaded — they will play locally but won't restore after a reload.`,
    );
  }

  return result;
}
