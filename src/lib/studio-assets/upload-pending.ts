import { getAudioBuffer, getOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { useDraftStatusStore } from '@/daw/persistence/drafts/draftStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { studioAssetsApi, uploadAndFinalizeAsset } from './api';
import { audioBufferToOpusWebm, isOpusEncodingSupported } from './encode-opus';
import { audioBufferToWav } from './encode-wav';

interface PendingClip {
  trackId: string;
  clipId: string;
  buffer: AudioBuffer;
}

interface UploadPayload {
  bytes: ArrayBuffer;
  contentType: string;
}

// MIME types we want to re-encode to Opus rather than upload as-is. These are
// either uncompressed (WAV) or large lossless (FLAC) — much bigger than the
// equivalent Opus would be. Everything else (Opus, MP3, AAC, etc.) is already
// compressed and we keep it as-is to avoid a quality-losing re-encode.
const UNCOMPRESSED_CONTENT_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/flac',
  'audio/x-flac',
]);

function isUncompressedAudio(contentType: string): boolean {
  return UNCOMPRESSED_CONTENT_TYPES.has(
    contentType.split(';')[0].trim().toLowerCase(),
  );
}

/**
 * Pick the bytes to upload for a clip. Decision tree:
 *
 *   1. Has an original AND it's already a compressed format (Opus, MP3, etc.)
 *      → upload as-is. Smallest possible (matches the source) + lossless from
 *      our perspective (no re-encoding).
 *   2. Has an original but it's uncompressed (WAV/FLAC), OR has no original
 *      → encode the decoded AudioBuffer to Opus via WebCodecs. ~10x smaller
 *      than WAV at perceptually-equivalent quality.
 *   3. Opus encoder unavailable (very old browser) → fall back to WAV.
 */
async function pickUploadPayload(
  clipId: string,
  buffer: AudioBuffer,
): Promise<UploadPayload> {
  const original = getOriginalAudio(clipId);

  if (original && !isUncompressedAudio(original.contentType)) {
    return {
      bytes: original.bytes,
      contentType: original.contentType,
    };
  }

  if (isOpusEncodingSupported()) {
    try {
      const opusBytes = await audioBufferToOpusWebm(buffer);
      return {
        bytes: opusBytes,
        contentType: 'audio/webm;codecs=opus',
      };
    } catch (err) {
      console.warn(
        `[studio-assets] Opus encoding failed for clip ${clipId}; falling back to WAV`,
        err,
      );
    }
  }

  return {
    bytes: audioBufferToWav(buffer),
    contentType: 'audio/wav',
  };
}

/**
 * The session an upload's stamps are for (milestone 1.4): an assetId lands on
 * the store only while getSessionGeneration() is still `generation` and,
 * when `projectId` is given, while the session is still linked to that cloud
 * project (the link at upload time). Once another project has opened, a clip
 * or sample with the same id belongs to that project; once the link moved
 * (File ▸ Delete, a Save As), the asset belongs to a project the session let
 * go of, and the clip keeps its bytes pending in the draft instead.
 */
export interface UploadFence {
  generation: number;
  /** The cloud link the upload went to; undefined: not checked. */
  projectId?: string | null;
}

/** Whether the session `fence` names is still open (no fence: always). */
const fenceHolds = (fence: UploadFence | undefined): boolean =>
  fence === undefined ||
  (getSessionGeneration() === fence.generation &&
    (fence.projectId === undefined ||
      useStore.getState().projectId === fence.projectId));

/** An assetId an upload stamped on the store (for a caller to undo). */
export type AssetStamp =
  | { kind: 'clip'; trackId: string; clipId: string; assetId: string }
  | { kind: 'sample'; trackId: string; sampleId: string; assetId: string };

/** Options of the save-time sweeps. */
export interface UploadSweepOptions {
  fence?: UploadFence;
  /** Told of every assetId stamped (a Save As undoes them if it fails). */
  onStamp?: (stamp: AssetStamp) => void;
}

/**
 * Undo stamps a save made, in the session that made them: each clip or
 * sample still holding the stamped assetId goes back to pending (null), so
 * its bytes stay in memory and in the device draft. Used when a Save As
 * fails after its uploads: the assets belong to a copy that never became
 * the session's project.
 */
export function revertAssetStamps(
  stamps: readonly AssetStamp[],
  fence: UploadFence,
): void {
  if (stamps.length === 0 || getSessionGeneration() !== fence.generation) {
    return;
  }
  const state = useStore.getState();
  for (const stamp of stamps) {
    const track = state.tracks.find((t) => t.id === stamp.trackId);
    if (!track) continue;
    if (stamp.kind === 'clip') {
      const clip = track.audioClips.find((c) => c.id === stamp.clipId);
      if (clip?.assetId === stamp.assetId) {
        state.updateAudioClip(track.id, clip.id, { assetId: null });
      }
    } else {
      const current = track.samplerSample;
      if (
        current?.sampleId === stamp.sampleId &&
        current.assetId === stamp.assetId
      ) {
        state.setSamplerSample(track.id, { ...current, assetId: null });
      }
    }
  }
}

/** One upload that failed: the item, the error for logs, its HTTP status. */
export interface UploadFailure {
  clipId: string;
  error: string;
  /** The HTTP status the asset API answered, when there was one. */
  status?: number;
}

/** The HTTP status in an asset API error ("POST … failed (404): …"). */
function failureStatus(reason: unknown): number | undefined {
  const status = (reason as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return status;
  const message = reason instanceof Error ? reason.message : String(reason);
  const match = /failed \((\d{3})\)/.exec(message);
  return match ? Number(match[1]) : undefined;
}

/**
 * Thrown by uploadPendingAudioClips when every upload failed. The message is
 * today's ("Audio upload failed: …"), for logs; callers word it themselves.
 */
export class AudioUploadError extends Error {
  readonly name = 'AudioUploadError';
  constructor(readonly failures: ReadonlyArray<UploadFailure>) {
    super(`Audio upload failed: ${failures[0]?.error ?? 'unknown error'}`);
  }
}

/**
 * Thrown by uploadPendingAudioClips when at least one clip failed but at least
 * one succeeded. Lets the caller distinguish "save partially succeeded, retry
 * to finish" from "save totally failed".
 *
 * Succeeded clips have already had their assetId stamped on the store, so the
 * retry only re-uploads the ones still missing an assetId.
 */
export class PartialUploadError extends Error {
  readonly name = 'PartialUploadError';
  constructor(
    readonly succeededCount: number,
    readonly failedCount: number,
    readonly failures: ReadonlyArray<UploadFailure>,
  ) {
    super(
      `Uploaded ${succeededCount} of ${
        succeededCount + failedCount
      } audio item(s); ${failedCount} failed. Click Save again to retry the failed uploads.`,
    );
  }
}

/**
 * Stamp `assetId` on every audio clip that has no asset yet and plays
 * `buffer`. Clips cut from one recording (split halves, record-over
 * remainders) and duplicates play it through the same decoded buffer under
 * their own ids (AudioBufferStore.shareClipAudio), so one upload covers them
 * all. A clip deleted meanwhile simply isn't found.
 */
function stampAssetOnClipsPlaying(
  buffer: AudioBuffer,
  assetId: string,
  fence?: UploadFence,
  onStamp?: (stamp: AssetStamp) => void,
): void {
  if (!fenceHolds(fence)) return;
  const state = useStore.getState();
  for (const track of state.tracks) {
    for (const clip of track.audioClips) {
      if (!clip.assetId && getAudioBuffer(clip.id) === buffer) {
        state.updateAudioClip(track.id, clip.id, { assetId });
        onStamp?.({
          kind: 'clip',
          trackId: track.id,
          clipId: clip.id,
          assetId,
        });
      }
    }
  }
}

// Clips whose audio is currently being uploaded by uploadRecordedClip (the
// immediate-on-record path), keyed by clip id. uploadPendingAudioClips awaits
// these instead of starting its own upload, so a Save fired mid-record-upload
// doesn't race and leak a duplicate orphan asset.
const recordingUploadsInFlight = new Map<string, Promise<UploadOutcome>>();

/**
 * What an immediate upload did: 'uploaded' (and stamped), 'deferred' (the
 * project has no cloud copy yet, so its draft keeps the bytes until the
 * first Save), or 'superseded' (another project opened meanwhile; nothing
 * was stamped).
 */
export type UploadOutcome = 'uploaded' | 'deferred' | 'superseded';

/**
 * Whether this device's draft can keep a never-saved project's audio until
 * its first Save: drafts run on IndexedDB (the localStorage fallback holds
 * no media), and no media write has failed or been left out (quota, the
 * media budget). When it can't, a take is never left only in memory: it
 * uploads at once, as before 1.4.
 */
export function draftCanHoldMedia(): boolean {
  const { adapter, media } = useDraftStatusStore.getState();
  return (
    adapter === 'indexeddb' && media.lastError === null && media.missing === 0
  );
}

/** Whether an immediate upload leaves the bytes to the draft for now. */
function deferToDraft(): boolean {
  const state = useStore.getState();
  return !state.projectId && !state.roomId && draftCanHoldMedia();
}

/**
 * The cloud project an immediate upload goes to, or null to leave the bytes
 * in the draft. A project with a cloud copy uploads at once. A project
 * without one creates nothing (milestone 1.4: no silent cloud project)
 * unless it is in a collab room: peers hear a recording only through its
 * asset, so a room's take mints the session's draft project as before
 * (ensureProjectId, which records it for LeaveSavePrompt). Nor when the
 * device's draft can't keep the bytes (draftCanHoldMedia): then the take
 * mints the project and uploads, so it survives a reload.
 */
async function immediateUploadTarget(
  token: string,
  generation: number,
): Promise<string | null | 'superseded'> {
  const state = useStore.getState();
  if (state.projectId) return state.projectId;
  if (deferToDraft()) return null;
  // Dynamic import to keep the studio-projects module out of the recording
  // hot path's static graph (and to avoid a static import cycle).
  const { ensureProjectId } = await import('@/lib/studio-projects/api');
  if (getSessionGeneration() !== generation) return 'superseded';
  const projectId = await ensureProjectId(token);
  if (getSessionGeneration() !== generation) return 'superseded';
  return projectId;
}

/**
 * Upload a single just-recorded clip's audio to GCS immediately and stamp the
 * returned assetId onto the clip. Called the instant recording stops so the
 * bytes reach the cloud project before anything else can happen to them.
 *
 * Only a project with a cloud copy uploads at once (or one in a collab room,
 * see immediateUploadTarget): a never-saved project's take stays in memory
 * and in its device draft (pendingMedia), and uploads at the first Save. The
 * stamp lands only while the session it was recorded in is still open. On
 * any failure the clip keeps assetId=null, so the eventual cloud Save will
 * retry it via uploadPendingAudioClips — the caller should surface the error
 * to the user.
 */
export async function uploadRecordedClip(
  token: string,
  trackId: string,
  clipId: string,
): Promise<UploadOutcome> {
  const existing = recordingUploadsInFlight.get(clipId);
  if (existing) return existing;
  if (deferToDraft()) return 'deferred';
  const generation = getSessionGeneration();

  const upload = (async (): Promise<UploadOutcome> => {
    const buffer = getAudioBuffer(clipId);
    if (!buffer) {
      throw new Error(`No AudioBuffer in store for recorded clip ${clipId}`);
    }

    const projectId = await immediateUploadTarget(token, generation);
    if (projectId === 'superseded') return 'superseded';
    if (projectId === null) return 'deferred';
    // Stamp only in this session, while it is still linked to the project
    // the bytes went to (File ▸ Delete meanwhile: the draft keeps them).
    const fence: UploadFence = { generation, projectId };

    const payload = await pickUploadPayload(clipId, buffer);
    const asset = await uploadAndFinalizeAsset(token, {
      projectId,
      bytes: payload.bytes,
      contentType: payload.contentType,
      source: 'recording',
      durationSeconds: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
    });

    // The take, and any halves or remainders cut from it while the upload
    // was in flight: they play the same recording, and a refresh before the
    // next Save would otherwise lose the ones with new ids.
    if (!fenceHolds(fence)) return 'superseded';
    stampAssetOnClipsPlaying(buffer, asset.id, fence);
    return 'uploaded';
  })();

  recordingUploadsInFlight.set(clipId, upload);
  try {
    return await upload;
  } finally {
    recordingUploadsInFlight.delete(clipId);
  }
}

// Sampler one-shots currently uploading, keyed by `${trackId}:${sampleId}` —
// same dedupe role as recordingUploadsInFlight, shared with the save-time
// sweep below. Keyed by sample identity so replacing a sample mid-upload
// starts a fresh upload for the new bytes instead of reusing the old one.
const samplerUploadsInFlight = new Map<string, Promise<UploadOutcome>>();

/**
 * Upload a Chops track's dropped one-shot to GCS immediately and stamp the
 * returned assetId onto Track.samplerSample — the drop-time twin of
 * uploadRecordedClip, with the same rule: a project without a cloud copy
 * (outside a collab room) keeps the bytes in its draft until the first Save.
 * Bundled samples (sourceUrl set) and already-uploaded samples are no-ops.
 * On failure the sample keeps assetId=null and the save-time sweep in
 * uploadPendingAudioClips retries it.
 */
export async function uploadSamplerSample(
  token: string,
  trackId: string,
): Promise<UploadOutcome> {
  const state = useStore.getState();
  const startSample = state.tracks.find((t) => t.id === trackId)?.samplerSample;
  if (!startSample || startSample.assetId || startSample.sourceUrl) {
    return 'uploaded';
  }

  const inFlightKey = `${trackId}:${startSample.sampleId}`;
  const existing = samplerUploadsInFlight.get(inFlightKey);
  if (existing) return existing;
  if (deferToDraft()) return 'deferred';
  const generation = getSessionGeneration();

  const bufferKey = samplerBufferKey(startSample.sampleId);
  const upload = (async (): Promise<UploadOutcome> => {
    const buffer = getAudioBuffer(bufferKey);
    if (!buffer) {
      throw new Error(`No AudioBuffer in store for sampler track ${trackId}`);
    }

    const projectId = await immediateUploadTarget(token, generation);
    if (projectId === 'superseded') return 'superseded';
    if (projectId === null) return 'deferred';
    const fence: UploadFence = { generation, projectId };

    const payload = await pickUploadPayload(bufferKey, buffer);
    const asset = await uploadAndFinalizeAsset(token, {
      projectId,
      bytes: payload.bytes,
      contentType: payload.contentType,
      source: 'upload',
      originalName: startSample.name,
      durationSeconds: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
    });

    // Only stamp the sample these bytes belong to — a replace mid-upload
    // mints a new sampleId, so the stale stamp is refused exactly — and only
    // in the session it was dropped into.
    if (!fenceHolds(fence)) return 'superseded';
    const current = useStore
      .getState()
      .tracks.find((t) => t.id === trackId)?.samplerSample;
    if (current?.sampleId === startSample.sampleId && !current.assetId) {
      useStore
        .getState()
        .setSamplerSample(trackId, { ...current, assetId: asset.id });
    }
    return 'uploaded';
  })();

  samplerUploadsInFlight.set(inFlightKey, upload);
  try {
    return await upload;
  } finally {
    samplerUploadsInFlight.delete(inFlightKey);
  }
}

/**
 * Find every audio clip in the store whose `assetId` is still null, encode its
 * in-memory AudioBuffer as WAV, upload to GCS, and stamp the returned asset id
 * onto the clip. Also sweeps Chops tracks whose samplerSample is still pending
 * (assetId null, not bundled). Runs uploads in parallel via Promise.allSettled
 * so a single failure doesn't strand the other in-flight uploads.
 *
 * Throws:
 *   - PartialUploadError when at least one upload succeeded and at least one
 *     failed. Succeeded clips keep their newly-stamped assetIds; retrying the
 *     save will only re-upload the failed ones.
 *   - Plain Error when zero uploads succeeded — surface the first failure's
 *     message so the user sees something actionable.
 *
 * Clips without a matching AudioBuffer in the store are skipped with a warning
 * — that's a programmer error (the buffer should have been stashed when the
 * clip was created), but we don't want to block the save over it.
 *
 * With `fence`, the assetIds are stamped only while that session is still
 * open (a save's own session; see UploadFence). `onStamp` hears of each one.
 * Each failure carries the asset API's HTTP status when it had one, so a
 * save can tell a project deleted elsewhere from a flaky upload.
 */
export async function uploadPendingAudioClips(
  token: string,
  projectId: string,
  opts: UploadSweepOptions = {},
): Promise<void> {
  const { fence, onStamp } = opts;
  // Let any in-progress immediate uploads (recording stop, sampler drop)
  // finish first; they stamp their own assetIds, so awaiting them keeps us
  // from re-uploading the same bytes (a duplicate orphan asset). Failures are
  // ignored here — the item just stays pending and gets picked up below.
  const inFlight = [
    ...recordingUploadsInFlight.values(),
    ...samplerUploadsInFlight.values(),
  ];
  if (inFlight.length > 0) {
    await Promise.allSettled(inFlight);
  }

  const pending: PendingClip[] = [];
  // Clips cut from one recording share its buffer: upload it once, and the
  // stamp below covers every clip playing it.
  const queued = new Set<AudioBuffer>();
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId) continue;
      const buffer = getAudioBuffer(clip.id);
      if (!buffer) {
        console.warn(
          `[studio-assets] Skipping clip ${clip.id} on save — no AudioBuffer in store`,
        );
        continue;
      }
      if (queued.has(buffer)) continue;
      queued.add(buffer);
      pending.push({ trackId: track.id, clipId: clip.id, buffer });
    }
  }

  // Pending sampler one-shots (never bundled sourceUrl samples — those
  // rehydrate from the public URL and are deliberately not uploaded).
  const pendingSamplers: Array<{
    trackId: string;
    sampleId: string;
    buffer: AudioBuffer;
  }> = [];
  for (const track of useStore.getState().tracks) {
    const sample = track.samplerSample;
    if (!sample || sample.assetId || sample.sourceUrl) continue;
    const buffer = getAudioBuffer(samplerBufferKey(sample.sampleId));
    if (!buffer) {
      console.warn(
        `[studio-assets] Skipping sampler sample on track ${track.id} on save — no AudioBuffer in store`,
      );
      continue;
    }
    pendingSamplers.push({
      trackId: track.id,
      sampleId: sample.sampleId,
      buffer,
    });
  }

  if (pending.length === 0 && pendingSamplers.length === 0) return;

  const jobLabels = [
    ...pending.map((p) => p.clipId),
    ...pendingSamplers.map((p) => samplerBufferKey(p.sampleId)),
  ];
  const results = await Promise.allSettled([
    ...pending.map(async ({ clipId, buffer }) => {
      const payload = await pickUploadPayload(clipId, buffer);
      const asset = await uploadAndFinalizeAsset(token, {
        projectId,
        bytes: payload.bytes,
        contentType: payload.contentType,
        // Source defaults to 'upload' until we track the origin on the clip
        // itself (recording vs file-drop vs freesound vs replicate).
        source: 'upload',
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });

      // Stamp the live asset id onto every clip playing this recording so the
      // next save round-trips them and a partial-success retry doesn't
      // re-upload it.
      stampAssetOnClipsPlaying(buffer, asset.id, fence, onStamp);
    }),
    ...pendingSamplers.map(async ({ trackId, sampleId, buffer }) => {
      const bufferKey = samplerBufferKey(sampleId);
      const payload = await pickUploadPayload(bufferKey, buffer);
      const asset = await uploadAndFinalizeAsset(token, {
        projectId,
        bytes: payload.bytes,
        contentType: payload.contentType,
        source: 'upload',
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });

      // Stamp only the sample these bytes belong to — a replace mid-save
      // mints a new sampleId, and stamping the old asset onto the new sample
      // would permanently point it at the wrong audio.
      if (!fenceHolds(fence)) return;
      const current = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.samplerSample;
      if (current?.sampleId === sampleId && !current.assetId) {
        useStore
          .getState()
          .setSamplerSample(trackId, { ...current, assetId: asset.id });
        onStamp?.({ kind: 'sample', trackId, sampleId, assetId: asset.id });
      }
    }),
  ]);

  const failures: UploadFailure[] = [];
  let succeededCount = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      succeededCount++;
    } else {
      const status = failureStatus(result.reason);
      failures.push({
        clipId: jobLabels[i],
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        ...(status === undefined ? {} : { status }),
      });
    }
  }

  if (failures.length === 0) return;

  console.error(
    `[studio-assets] ${failures.length} of ${jobLabels.length} audio uploads failed`,
    failures,
  );

  if (succeededCount === 0) {
    // Total failure — surface the first failure's message so the user sees
    // something more useful than a generic count.
    throw new AudioUploadError(failures);
  }

  throw new PartialUploadError(succeededCount, failures.length, failures);
}

/** What reconcileMissingAssets did to references whose asset is gone. */
export interface ReconcileResult {
  /** Re-uploaded from memory and re-stamped. */
  reuploaded: number;
  /** No bytes left anywhere: the reference was dropped. */
  unrecoverable: number;
  /**
   * The re-upload failed but the bytes are still in memory: the clip or
   * sample is pending again. (Always set here; optional for older mocks.)
   */
  reuploadFailed?: number;
}

/**
 * Reconcile clips whose referenced asset has gone missing on the server before a
 * save. Closes the collab race where another participant left a session
 * "without saving" and reclaimed an asset this user's clip still points at
 * (see delete-project / LeaveSavePrompt).
 *
 * For each clip referencing a missing asset:
 *   - if its decoded audio is still in this user's in-memory buffer (collab
 *     peers download it to play it), RE-UPLOAD as a fresh asset and re-stamp the
 *     clip — the save then round-trips cleanly. When that re-upload fails, the
 *     clip goes back to pending (assetId null, its bytes still in memory and
 *     in the device draft): counted as `reuploadFailed`, it uploads again at
 *     the next save (a project deleted elsewhere: once the save re-creates it).
 *   - otherwise the bytes are unrecoverable: clear the clip's assetId so the
 *     save drops it instead of failing, and count it so the caller can alert
 *     the user that the resource can no longer be found.
 *
 * Best-effort: a status-check failure leaves the references untouched and lets
 * the save proceed (the server's assertAudioAssetsReady is the backstop).
 *
 * With `fence`, it changes the store only while that session is still open.
 */
export async function reconcileMissingAssets(
  token: string,
  projectId: string,
  opts: UploadSweepOptions = {},
): Promise<ReconcileResult> {
  const { fence, onStamp } = opts;
  const none: ReconcileResult = {
    reuploaded: 0,
    unrecoverable: 0,
    reuploadFailed: 0,
  };
  const referenced: { trackId: string; clipId: string; assetId: string }[] = [];
  // Sampler samples referencing an asset (buffer keyed by samplerBufferKey).
  const referencedSamplers: {
    trackId: string;
    sampleId: string;
    assetId: string;
  }[] = [];
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId) {
        referenced.push({
          trackId: track.id,
          clipId: clip.id,
          assetId: clip.assetId,
        });
      }
    }
    if (track.samplerSample?.assetId) {
      referencedSamplers.push({
        trackId: track.id,
        sampleId: track.samplerSample.sampleId,
        assetId: track.samplerSample.assetId,
      });
    }
  }
  if (referenced.length === 0 && referencedSamplers.length === 0) {
    return none;
  }

  const assetIds = Array.from(
    new Set([
      ...referenced.map((r) => r.assetId),
      ...referencedSamplers.map((r) => r.assetId),
    ]),
  );

  let missing: string[];
  try {
    ({ missing } = await studioAssetsApi.checkStatus(token, assetIds));
  } catch (err) {
    console.warn(
      '[studio-assets] asset status check failed; skipping reconcile',
      err,
    );
    return none;
  }
  if (missing.length === 0) return none;

  // Every store change below is for this session only: once another project
  // has opened, a clip with the same id is that project's.
  const setClipAsset = (
    trackId: string,
    clipId: string,
    assetId: string | null,
  ) => {
    if (!fenceHolds(fence)) return;
    useStore.getState().updateAudioClip(trackId, clipId, { assetId });
    if (assetId) onStamp?.({ kind: 'clip', trackId, clipId, assetId });
  };

  const missingSet = new Set(missing);
  let reuploaded = 0;
  let unrecoverable = 0;
  let reuploadFailed = 0;

  for (const { trackId, clipId, assetId } of referenced) {
    if (!missingSet.has(assetId)) continue;

    const buffer = getAudioBuffer(clipId);
    if (!buffer) {
      // No local bytes to re-upload — drop the dangling reference so the save
      // succeeds without it; the caller alerts the user.
      setClipAsset(trackId, clipId, null);
      unrecoverable++;
      continue;
    }

    try {
      const payload = await pickUploadPayload(clipId, buffer);
      const asset = await uploadAndFinalizeAsset(token, {
        projectId,
        bytes: payload.bytes,
        contentType: payload.contentType,
        source: 'upload',
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });
      setClipAsset(trackId, clipId, asset.id);
      reuploaded++;
    } catch (err) {
      console.error(
        `[studio-assets] re-upload of missing asset for clip ${clipId} failed`,
        err,
      );
      // The bytes are still here: pending again, not lost.
      setClipAsset(trackId, clipId, null);
      reuploadFailed++;
    }
  }

  for (const { trackId, sampleId, assetId } of referencedSamplers) {
    if (!missingSet.has(assetId)) continue;

    const clearAssetId = () => {
      if (!fenceHolds(fence)) return;
      const current = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.samplerSample;
      if (current?.assetId === assetId) {
        useStore
          .getState()
          .setSamplerSample(trackId, { ...current, assetId: null });
      }
    };

    const buffer = getAudioBuffer(samplerBufferKey(sampleId));
    if (!buffer) {
      clearAssetId();
      unrecoverable++;
      continue;
    }

    try {
      const bufferKey = samplerBufferKey(sampleId);
      const payload = await pickUploadPayload(bufferKey, buffer);
      const asset = await uploadAndFinalizeAsset(token, {
        projectId,
        bytes: payload.bytes,
        contentType: payload.contentType,
        source: 'upload',
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });
      const current = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.samplerSample;
      if (fenceHolds(fence) && current?.assetId === assetId) {
        useStore
          .getState()
          .setSamplerSample(trackId, { ...current, assetId: asset.id });
        onStamp?.({ kind: 'sample', trackId, sampleId, assetId: asset.id });
      }
      reuploaded++;
    } catch (err) {
      console.error(
        `[studio-assets] re-upload of missing sampler asset on track ${trackId} failed`,
        err,
      );
      clearAssetId();
      reuploadFailed++;
    }
  }

  return { reuploaded, unrecoverable, reuploadFailed };
}
