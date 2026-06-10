// ── AudioBufferStore ────────────────────────────────────────────────────────
// Module-level per-clip audio store. Holds two things per clip id, both
// optional and set independently:
//
//   - `buffer`:   decoded PCM (AudioBuffer) used for playback + waveform render.
//   - `original`: the bytes the audio arrived as (e.g. audio/webm Opus from
//                 MediaRecorder, or the original File bytes from a drop). Used
//                 at cloud-save time to upload without re-encoding to WAV —
//                 Opus is ~10x smaller than WAV at equivalent quality.
//
// Neither survives a page refresh; for cloud-saved clips the bytes live in GCS
// and are re-fetched on Open via loadCloudProjectAudio.

interface ClipAudio {
  buffer?: AudioBuffer;
  original?: { bytes: ArrayBuffer; contentType: string };
}

const audioStore = new Map<string, ClipAudio>();

// Subscribers notified whenever the store mutates. Used by the timeline so a
// freshly-loaded audio buffer triggers a waveform redraw without polling.
const subscribers = new Set<() => void>();

function emitChange(): void {
  for (const cb of subscribers) cb();
}

export function subscribeAudioBufferChanges(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getOrCreate(clipId: string): ClipAudio {
  let entry = audioStore.get(clipId);
  if (!entry) {
    entry = {};
    audioStore.set(clipId, entry);
  }
  return entry;
}

export function getAudioBuffer(clipId: string): AudioBuffer | undefined {
  return audioStore.get(clipId)?.buffer;
}

export function setAudioBuffer(clipId: string, buffer: AudioBuffer): void {
  getOrCreate(clipId).buffer = buffer;
  emitChange();
}

export function getOriginalAudio(
  clipId: string,
): { bytes: ArrayBuffer; contentType: string } | undefined {
  return audioStore.get(clipId)?.original;
}

export function setOriginalAudio(
  clipId: string,
  bytes: ArrayBuffer,
  contentType: string,
): void {
  getOrCreate(clipId).original = { bytes, contentType };
  emitChange();
}

export function removeAudioBuffer(clipId: string): void {
  audioStore.delete(clipId);
  emitChange();
}

export function clearAudioBuffers(): void {
  audioStore.clear();
  emitChange();
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
