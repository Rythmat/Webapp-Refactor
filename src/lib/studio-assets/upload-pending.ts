import { getAudioBuffer, getOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { useStore } from '@/daw/store';
import { uploadAndFinalizeAsset } from './api';
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
  const state = useStore.getState();

  const pending: PendingClip[] = [];
  for (const track of state.tracks) {
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
