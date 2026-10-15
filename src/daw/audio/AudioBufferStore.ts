// ── AudioBufferStore ────────────────────────────────────────────────────────
// The editor's face of the audio asset store (assets/assetStore.ts): the
// audio a clip (or a Chops sample, by samplerBufferKey) plays, by its id.
// Holds two things per clip, both optional and set independently:
//
//   - `buffer`:   decoded PCM (AudioBuffer) used for playback + waveform render.
//   - `original`: the bytes the audio arrived as (e.g. audio/webm Opus from
//                 MediaRecorder, or the original File bytes from a drop). Used
//                 at cloud-save time to upload without re-encoding to WAV —
//                 Opus is ~10x smaller than WAV at equivalent quality.
//
// Since milestone 1.10 both belong to the recording, not the clip: clips cut
// from one recording (split halves, record-over remainders) and its pastes
// and duplicates play the same asset, so it is held, uploaded and drawn
// once. A cut, a delete or an overwrite never frees it (undo can bring the
// clip back); assets/assetGc.ts frees what nothing plays any more.
//
// For cloud-saved clips the bytes live in GCS and are fetched again on open
// (lib/studio-assets/load-audio.ts); a take never uploaded lives in the
// device's drafts (persistence/drafts/pendingMedia.ts).

import {
  bufferOf,
  clearAssets,
  flushAssetChanges,
  originalOf,
  setBuffer,
  setOriginal,
  share,
  subscribeAssetChanges,
  unlink,
} from './assets/assetStore';

/** Sends a batched change now, for tests that read the store's subscribers. */
export function flushAudioBufferChanges(): void {
  flushAssetChanges();
}

/**
 * Called whenever audio, or a clip's load status, changes: at most once a
 * frame (a short timer in a hidden tab).
 */
export function subscribeAudioBufferChanges(cb: () => void): () => void {
  return subscribeAssetChanges(cb);
}

export function getAudioBuffer(clipId: string): AudioBuffer | undefined {
  return bufferOf(clipId);
}

export function setAudioBuffer(clipId: string, buffer: AudioBuffer): void {
  setBuffer(clipId, buffer);
}

export function getOriginalAudio(
  clipId: string,
): { bytes: ArrayBuffer; contentType: string } | undefined {
  return originalOf(clipId);
}

export function setOriginalAudio(
  clipId: string,
  bytes: ArrayBuffer,
  contentType: string,
): void {
  setOriginal(clipId, bytes, contentType);
}

/**
 * Let `toClipId` play the audio `fromClipId` plays: the same recording, for
 * a clip that plays a window of it through its offsetSeconds. Returns false
 * when `fromClipId` plays nothing yet (a cloud clip still downloading loads
 * by its assetId).
 */
export function shareClipAudio(fromClipId: string, toClipId: string): boolean {
  return share(fromClipId, toClipId);
}

/**
 * `clipId` stops playing its audio. The recording itself is freed only once
 * nothing plays it, not even through undo (assets/assetGc.ts).
 */
export function removeAudioBuffer(clipId: string): void {
  unlink(clipId);
}

export function clearAudioBuffers(): void {
  clearAssets();
}

/** Slice an AudioBuffer from startSample to endSample (exclusive). */
export function sliceBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  startSample: number,
  endSample: number,
): AudioBuffer {
  const length = Math.max(1, endSample - startSample);
  const newBuffer = ctx.createBuffer(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate,
  );
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = newBuffer.getChannelData(ch);
    dst.set(src.subarray(startSample, endSample));
  }
  return newBuffer;
}

/** Compute peak amplitudes for waveform rendering. Returns normalized 0-1 peaks. */
export function computePeaks(
  buffer: AudioBuffer,
  numPeaks: number,
  // Optional sample window [windowStart, windowEnd) so a trimmed clip can render
  // only the portion of the buffer it actually plays. Defaults to the whole buffer.
  windowStart = 0,
  windowEnd = buffer.length,
): number[] {
  const channelData = buffer.getChannelData(0); // mono or left channel
  const rangeStart = Math.max(0, Math.min(windowStart, channelData.length));
  const rangeEnd = Math.max(
    rangeStart,
    Math.min(windowEnd, channelData.length),
  );
  const rangeLength = rangeEnd - rangeStart;
  const samplesPerPeak = Math.max(1, Math.floor(rangeLength / numPeaks));
  const peaks: number[] = [];

  let maxPeak = 0;
  for (let i = 0; i < numPeaks; i++) {
    let peak = 0;
    const start = rangeStart + i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, rangeEnd);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > peak) peak = abs;
    }
    peaks.push(peak);
    if (peak > maxPeak) maxPeak = peak;
  }

  // Normalize
  if (maxPeak > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] /= maxPeak;
    }
  }

  return peaks;
}
