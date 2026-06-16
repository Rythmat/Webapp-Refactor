import { getAudioBuffer, getOriginalAudio } from '@/daw/audio/AudioBufferStore';
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
    readonly failures: ReadonlyArray<{ clipId: string; error: string }>,
  ) {
    super(
      `Uploaded ${succeededCount} of ${
        succeededCount + failedCount
      } audio clip(s); ${failedCount} failed. Click Save again to retry the failed clips.`,
    );
  }
}

// Clips whose audio is currently being uploaded by uploadRecordedClip (the
// immediate-on-record path), keyed by clip id. uploadPendingAudioClips awaits
// these instead of starting its own upload, so a Save fired mid-record-upload
// doesn't race and leak a duplicate orphan asset.
const recordingUploadsInFlight = new Map<string, Promise<void>>();

/**
 * Upload a single just-recorded clip's audio to GCS immediately and stamp the
 * returned assetId onto the clip. Called the instant recording stops so the
 * bytes are durably persisted before a page reload can drop the in-memory
 * AudioBuffer (which never survives a refresh).
 *
 * Ensures the cloud project exists first (minting it if this is an unsaved
 * project). On any failure the clip keeps assetId=null, so the eventual cloud
 * Save will retry it via uploadPendingAudioClips — the caller should surface
 * the error to the user.
 */
export async function uploadRecordedClip(
  token: string,
  trackId: string,
  clipId: string,
): Promise<void> {
  const existing = recordingUploadsInFlight.get(clipId);
  if (existing) return existing;

  const upload = (async () => {
    const buffer = getAudioBuffer(clipId);
    if (!buffer) {
      throw new Error(`No AudioBuffer in store for recorded clip ${clipId}`);
    }

    // Dynamic import to keep the studio-projects module out of the recording
    // hot path's static graph (and to avoid a static import cycle).
    const { ensureProjectId } = await import('@/lib/studio-projects/api');
    const projectId = await ensureProjectId(token);

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

    // Guard against the clip having been deleted while the upload was in flight.
    const stillExists = useStore
      .getState()
      .tracks.some((t) => t.audioClips.some((c) => c.id === clipId));
    if (stillExists) {
      useStore.getState().updateAudioClip(trackId, clipId, {
        assetId: asset.id,
      });
    }
  })();

  recordingUploadsInFlight.set(clipId, upload);
  try {
    await upload;
  } finally {
    recordingUploadsInFlight.delete(clipId);
  }
}

/**
 * Find every audio clip in the store whose `assetId` is still null, encode its
 * in-memory AudioBuffer as WAV, upload to GCS, and stamp the returned asset id
 * onto the clip. Runs uploads in parallel via Promise.allSettled so a single
 * failure doesn't strand the other in-flight uploads.
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
 */
export async function uploadPendingAudioClips(
  token: string,
  projectId: string,
): Promise<void> {
  // Let any in-progress immediate-on-record uploads finish first; they stamp
  // their own assetIds, so awaiting them keeps us from re-uploading the same
  // clip (a duplicate orphan asset). Failures are ignored here — the clip just
  // stays pending and gets picked up below.
  const inFlight = Array.from(recordingUploadsInFlight.values());
  if (inFlight.length > 0) {
    await Promise.allSettled(inFlight);
  }

  const pending: PendingClip[] = [];
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
      pending.push({ trackId: track.id, clipId: clip.id, buffer });
    }
  }

  if (pending.length === 0) return;

  const results = await Promise.allSettled(
    pending.map(async ({ trackId, clipId, buffer }) => {
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

      // Stamp the live asset id onto the clip so the next save round-trips it
      // and a partial-success retry doesn't re-upload this clip.
      useStore.getState().updateAudioClip(trackId, clipId, {
        assetId: asset.id,
      });
    }),
  );

  const failures: Array<{ clipId: string; error: string }> = [];
  let succeededCount = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      succeededCount++;
    } else {
      failures.push({
        clipId: pending[i].clipId,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  }

  if (failures.length === 0) return;

  console.error(
    `[studio-assets] ${failures.length} of ${pending.length} audio uploads failed`,
    failures,
  );

  if (succeededCount === 0) {
    // Total failure — surface the first failure's message so the user sees
    // something more useful than a generic count.
    throw new Error(`Audio upload failed: ${failures[0].error}`);
  }

  throw new PartialUploadError(succeededCount, failures.length, failures);
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
 *     clip — the save then round-trips cleanly.
 *   - otherwise the bytes are unrecoverable: clear the clip's assetId so the
 *     save drops it instead of failing, and count it so the caller can alert
 *     the user that the resource can no longer be found.
 *
 * Best-effort: a status-check failure leaves the references untouched and lets
 * the save proceed (the server's assertAudioAssetsReady is the backstop).
 */
export async function reconcileMissingAssets(
  token: string,
  projectId: string,
): Promise<{ reuploaded: number; unrecoverable: number }> {
  const referenced: { trackId: string; clipId: string; assetId: string }[] = [];
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
  }
  if (referenced.length === 0) return { reuploaded: 0, unrecoverable: 0 };

  const assetIds = Array.from(new Set(referenced.map((r) => r.assetId)));

  let missing: string[];
  try {
    ({ missing } = await studioAssetsApi.checkStatus(token, assetIds));
  } catch (err) {
    console.warn(
      '[studio-assets] asset status check failed; skipping reconcile',
      err,
    );
    return { reuploaded: 0, unrecoverable: 0 };
  }
  if (missing.length === 0) return { reuploaded: 0, unrecoverable: 0 };

  const missingSet = new Set(missing);
  let reuploaded = 0;
  let unrecoverable = 0;

  for (const { trackId, clipId, assetId } of referenced) {
    if (!missingSet.has(assetId)) continue;

    const buffer = getAudioBuffer(clipId);
    if (!buffer) {
      // No local bytes to re-upload — drop the dangling reference so the save
      // succeeds without it; the caller alerts the user.
      useStore.getState().updateAudioClip(trackId, clipId, { assetId: null });
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
      useStore
        .getState()
        .updateAudioClip(trackId, clipId, { assetId: asset.id });
      reuploaded++;
    } catch (err) {
      console.error(
        `[studio-assets] re-upload of missing asset for clip ${clipId} failed`,
        err,
      );
      useStore.getState().updateAudioClip(trackId, clipId, { assetId: null });
      unrecoverable++;
    }
  }

  return { reuploaded, unrecoverable };
}
