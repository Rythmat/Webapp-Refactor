import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { showError, showWarning } from '@/components/utils/toast';
import { Env } from '@/constants/env';
import {
  serializeSessionForCloud,
  type MidiClipColumnar,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';

// ── Shapes mirrored from music-atlas-api/src/services/studio-projects ────

export interface StudioProjectAudioClipInput {
  assetId: string;
  startTick: number;
  duration: number;
  offsetSeconds?: number;
  gain?: number;
  fadeInTicks?: number;
  fadeOutTicks?: number;
}

export interface StudioProjectAudioClip extends StudioProjectAudioClipInput {
  id: string;
  offsetSeconds: number;
  gain: number;
  fadeInTicks: number;
  fadeOutTicks: number;
}

export interface StudioProjectTrackInput {
  name: string;
  type: 'midi' | 'audio';
  instrument: string;
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  activeEffects: string[];
  midiClips: MidiClipColumnar[];
  audioClips: StudioProjectAudioClipInput[];
}

export interface StudioProjectInput {
  name: string;
  composerName?: string | null;
  bpm: number;
  prism: {
    rootNote: number | null;
    rhythmName: string;
    genre: string;
    swing: number;
  };
  tracks: StudioProjectTrackInput[];
}

export interface StudioProjectSummary {
  id: string;
  name: string;
  composerName: string | null;
  bpm: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioProjectTrack extends StudioProjectTrackInput {
  id: string;
  ordinal: number;
  audioClips: StudioProjectAudioClip[];
}

export interface StudioProjectDetail extends StudioProjectSummary {
  prism: StudioProjectInput['prism'];
  tracks: StudioProjectTrack[];
}

// ── Path / fetch helpers ─────────────────────────────────────────────────

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function projectsPath(suffix = '') {
  const base = apiBase();
  // Studio controller mounts at /api/studio; tolerate a base that already ends in /api.
  const prefix = base.endsWith('/api')
    ? '/studio/projects'
    : '/api/studio/projects';
  return `${prefix}${suffix}`;
}

async function request<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const response = await fetch(`${apiBase()}${path}`, {
    method: params.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
    },
    body: params.body != null ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let message: string;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? text.slice(0, 200);
    } catch {
      message = text.slice(0, 200) || `HTTP ${response.status}`;
    }
    throw new Error(
      `${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
    );
  }

  if (!text) return undefined as T;
  try {
    return SuperJSON.parse(text) as T;
  } catch {
    return JSON.parse(text) as T;
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export const studioProjectsApi = {
  list: (token: string) =>
    request<StudioProjectSummary[]>(projectsPath(), { token }),

  get: (token: string, id: string) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), { token }),

  create: (token: string, body: StudioProjectInput) =>
    request<StudioProjectDetail>(projectsPath(), {
      token,
      method: 'POST',
      body,
    }),

  update: (token: string, id: string, body: StudioProjectInput) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), {
      token,
      method: 'PUT',
      body,
    }),

  remove: (token: string, id: string) =>
    request<{ id: string; deletedAt: Date }>(projectsPath(`/${id}`), {
      token,
      method: 'DELETE',
    }),

  /**
   * Eagerly delete any `pending` AudioAsset rows + their bucket objects for
   * a single project. Used when the user explicitly abandons the project (e.g.
   * File → New Project) so failed-upload orphans don't wait for the global
   * hourly cron.
   */
  cleanupPendingAssets: (token: string, id: string) =>
    request<{ deletedRows: number; bucketDeleteFailures: number }>(
      projectsPath(`/${id}/cleanup-pending-assets`),
      { token, method: 'POST' },
    ),
};

// Guards against two concurrent first-saves (e.g. an upload-on-record firing at
// the same moment the user hits Save) each POSTing a fresh project. Whoever
// wins the race mints the id; everyone else awaits the same promise.
let projectCreateInFlight: Promise<string> | null = null;

/**
 * Return the current cloud project id, minting the project (audio-less) if it
 * doesn't exist yet. Audio clips without an assetId are dropped from the create
 * payload (they're uploaded separately), so this is safe to call the moment a
 * recording finishes — before any audio has an assetId.
 *
 * Concurrency-safe: simultaneous callers share a single create request.
 */
export async function ensureProjectId(
  token: string,
  nameOverride?: string,
): Promise<string> {
  const existing = useStore.getState().projectId;
  if (existing) return existing;
  if (projectCreateInFlight) return projectCreateInFlight;

  projectCreateInFlight = (async () => {
    const created = await studioProjectsApi.create(
      token,
      serializeSessionForCloud(nameOverride),
    );
    useStore.getState().setProjectId(created.id);
    return created.id;
  })();

  try {
    return await projectCreateInFlight;
  } finally {
    projectCreateInFlight = null;
  }
}

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
 *
 * Shared by the File menu Save button and the Cmd-S keyboard shortcut.
 */
export async function saveCurrentProjectToCloud(
  token: string,
  nameOverride?: string,
): Promise<StudioProjectDetail> {
  // Lazy import to avoid pulling the AudioBufferStore + WAV encoder into the
  // module graph for callers that don't need them (e.g. cmd-S handler binding).
  const { uploadPendingAudioClips, reconcileMissingAssets } = await import(
    '@/lib/studio-assets/upload-pending'
  );

  const projectId = await ensureProjectId(token, nameOverride);

  const hasPendingAudio = useStore
    .getState()
    .tracks.some((t) => t.audioClips.some((c) => !c.assetId));
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

  // Final write with the up-to-date payload (post-upload assetIds included).
  const result = await studioProjectsApi.update(
    token,
    projectId,
    serializeSessionForCloud(nameOverride),
  );

  // In a collab session, record that a save happened so the leave flow won't
  // reclaim this project as an "unsaved draft" (see LeaveSavePrompt).
  if (useStore.getState().isCollabActive) {
    useStore.getState()._markSessionSaved();
  }

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

  return result;
}
