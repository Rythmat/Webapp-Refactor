import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
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

/**
 * Save the current store state to the cloud, including uploading any in-memory
 * audio clips that don't yet have an assetId. Audio bytes only leave the
 * browser when Save is invoked — recording and importing keep clips ephemeral
 * until the user commits.
 *
 * Shapes the save as:
 *   1. If projectId is null: POST with whatever state we have (audio clips
 *      without assetId get dropped in serializeSessionForCloud, returning an
 *      empty audio section). This mints the projectId we need to upload to.
 *   2. Upload any pending audio clips, stamping their assetId onto the store.
 *   3. If there were pending clips OR this is an existing project: PUT the
 *      now-complete state.
 *
 * Shared by the File menu Save button and the Cmd-S keyboard shortcut.
 */
export async function saveCurrentProjectToCloud(
  token: string,
): Promise<StudioProjectDetail> {
  // Lazy import to avoid pulling the AudioBufferStore + WAV encoder into the
  // module graph for callers that don't need them (e.g. cmd-S handler binding).
  const { uploadPendingAudioClips } = await import(
    '@/lib/studio-assets/upload-pending'
  );

  const state = useStore.getState();
  const hasPendingAudio = state.tracks.some((t) =>
    t.audioClips.some((c) => !c.assetId),
  );

  let result: StudioProjectDetail;

  if (!state.projectId) {
    // First save — POST to mint the project id, even if we'll re-PUT in a
    // moment to attach uploaded audio. POST first because asset upload needs
    // a real projectId for ownership + bucket-key layout.
    result = await studioProjectsApi.create(token, serializeSessionForCloud());
    state.setProjectId(result.id);
    if (!hasPendingAudio) return result;
  }

  // projectId is non-null here either because it was set on entry or just got
  // stamped above.
  const projectId = useStore.getState().projectId;
  if (!projectId) {
    throw new Error('Save failed: projectId was unexpectedly null after POST');
  }

  if (hasPendingAudio) {
    await uploadPendingAudioClips(token, projectId);
  }

  // Final write with the up-to-date payload (post-upload assetIds included).
  result = await studioProjectsApi.update(
    token,
    projectId,
    serializeSessionForCloud(),
  );
  return result;
}
