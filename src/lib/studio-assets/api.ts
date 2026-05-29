import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';

// ── Shapes (mirror music-atlas-api/src/services/studio-assets) ───────────

export type AudioAssetSource =
  | 'recording'
  | 'upload'
  | 'ai_generated'
  | 'freesound';

export type AudioAssetUploadStatus = 'pending' | 'ready' | 'failed';

export interface CreateAssetInput {
  projectId: string;
  contentType: string;
  sizeBytes: number;
  originalName?: string;
  source: AudioAssetSource;
  sourceUrl?: string;
  checksumSha256?: string;
}

export interface CreateAssetResponse {
  assetId: string;
  bucketKey: string;
  signedUploadUrl: string;
  expiresAt: Date;
  maxUploadBytes: number;
}

export interface FinalizeAssetInput {
  durationSeconds: number;
  sampleRate?: number;
  channels?: number;
}

export interface AudioAssetSummary {
  id: string;
  projectId: string | null;
  bucketKey: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
  sampleRate: number | null;
  channels: number | null;
  originalName: string | null;
  source: AudioAssetSource;
  sourceUrl: string | null;
  checksumSha256: string | null;
  uploadStatus: AudioAssetUploadStatus;
  createdAt: Date;
}

export interface AssetDownloadUrl {
  url: string;
  expiresAt: Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function assetsPath(suffix = '') {
  const base = apiBase();
  const prefix = base.endsWith('/api')
    ? '/studio/assets'
    : '/api/studio/assets';
  return `${prefix}${suffix}`;
}

async function request<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST';
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const method = params.method ?? 'GET';
  const response = await fetchWithRetry(
    `${apiBase()}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json',
        ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      },
      body: params.body != null ? JSON.stringify(params.body) : undefined,
    },
    `${method} ${path}`,
  );

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
      `${method} ${path} failed (${response.status}): ${message}`,
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

export const studioAssetsApi = {
  create: (token: string, body: CreateAssetInput) =>
    request<CreateAssetResponse>(assetsPath(), {
      token,
      method: 'POST',
      body,
    }),

  finalize: (token: string, assetId: string, body: FinalizeAssetInput) =>
    request<AudioAssetSummary>(assetsPath(`/${assetId}/finalize`), {
      token,
      method: 'POST',
      body,
    }),

  getUrl: (token: string, assetId: string) =>
    request<AssetDownloadUrl>(assetsPath(`/${assetId}/url`), { token }),
};

// ── Upload helper ────────────────────────────────────────────────────────

export interface UploadAndFinalizeInput {
  projectId: string;
  bytes: ArrayBuffer;
  contentType: string;
  source: AudioAssetSource;
  originalName?: string;
  sourceUrl?: string;
  /** Decoded audio metadata; required to mark the asset ready. */
  durationSeconds: number;
  sampleRate?: number;
  channels?: number;
}

/**
 * Hash the bytes (SHA-256), reserve an AudioAsset row via the API, PUT the
 * bytes directly to GCS using the signed URL, then finalize the asset with
 * decoded metadata. Returns the live asset id ready to be referenced from an
 * AudioClip row.
 *
 * Surfaces errors verbatim; callers should toast / log as appropriate.
 */
export async function uploadAndFinalizeAsset(
  token: string,
  input: UploadAndFinalizeInput,
): Promise<AudioAssetSummary> {
  const checksumSha256 = await sha256Hex(input.bytes);

  const reservation = await studioAssetsApi.create(token, {
    projectId: input.projectId,
    contentType: input.contentType,
    sizeBytes: input.bytes.byteLength,
    originalName: input.originalName,
    source: input.source,
    sourceUrl: input.sourceUrl,
    checksumSha256,
  });

  if (input.bytes.byteLength > reservation.maxUploadBytes) {
    throw new Error(
      `File too large: ${input.bytes.byteLength} bytes exceeds cap of ${reservation.maxUploadBytes}`,
    );
  }

  const putResponse = await putBytesToGcsWithRetry(
    reservation.signedUploadUrl,
    input.bytes,
    input.contentType,
    reservation.maxUploadBytes,
  );

  if (!putResponse.ok) {
    const detail = await putResponse.text().catch(() => '');
    throw new Error(
      `GCS upload failed (${putResponse.status}): ${detail.slice(0, 200)}`,
    );
  }

  return studioAssetsApi.finalize(token, reservation.assetId, {
    durationSeconds: input.durationSeconds,
    sampleRate: input.sampleRate,
    channels: input.channels,
  });
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── HTTP retry-with-backoff ──────────────────────────────────────────────
//
// Retries up to 3 times for transient failures (network errors + 5xx + 408 +
// 429), backing off 1s / 2s / 4s with a small jitter. Non-transient HTTP
// errors (other 4xx) return immediately — those signal a real config or auth
// problem and won't be fixed by retrying.
//
// All callers in this file are safe to retry:
//   - GCS PUT is idempotent (object only visible after a full successful write)
//   - POST /studio/assets creates a new row; a duplicate from a retry-after-
//     committed-but-network-blip becomes an orphan that the cleanup cron
//     sweeps within 24h
//   - POST /studio/assets/:id/finalize is explicitly idempotent (returns the
//     existing row if already in 'ready' state)
//   - GET /studio/assets/:id/url is a pure read

const RETRY_MAX_ATTEMPTS = 4; // initial + 3 retries
const RETRY_BACKOFF_MS = [1000, 2000, 4000];
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
        return response;
      }
      lastResponse = response;
      if (attempt < RETRY_MAX_ATTEMPTS - 1) {
        console.warn(
          `[studio-assets] ${label} returned ${response.status}; retrying (${attempt + 1}/${RETRY_MAX_ATTEMPTS - 1})`,
        );
      }
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_MAX_ATTEMPTS - 1) {
        console.warn(
          `[studio-assets] ${label} network error; retrying (${attempt + 1}/${RETRY_MAX_ATTEMPTS - 1})`,
          err,
        );
      }
    }

    if (attempt < RETRY_MAX_ATTEMPTS - 1) {
      const baseDelay = RETRY_BACKOFF_MS[attempt];
      const jitter = Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  // Exhausted all attempts. If the last attempt got a (non-retryable-shaped)
  // response, return it so the caller can surface its body; otherwise rethrow
  // the last network error.
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error(`${label} failed after retries`);
}

function putBytesToGcsWithRetry(
  signedUrl: string,
  bytes: ArrayBuffer,
  contentType: string,
  maxUploadBytes: number,
): Promise<Response> {
  return fetchWithRetry(
    signedUrl,
    {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        // Must match the cap the server included in the signed URL or GCS
        // rejects the upload with 403.
        'x-goog-content-length-range': `0,${maxUploadBytes}`,
      },
      body: bytes,
    },
    'GCS PUT',
  );
}
