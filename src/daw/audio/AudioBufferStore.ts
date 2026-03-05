// ── AudioBufferStore ────────────────────────────────────────────────────────
// Module-level Map<clipId, AudioBuffer>. AudioBuffers are not serializable
// and won't survive page refresh, but they're needed for waveform rendering
// and playback during a session.

const audioBufferStore = new Map<string, AudioBuffer>();

export function getAudioBuffer(clipId: string): AudioBuffer | undefined {
  return audioBufferStore.get(clipId);
}

export function setAudioBuffer(clipId: string, buffer: AudioBuffer): void {
  audioBufferStore.set(clipId, buffer);
}

export function removeAudioBuffer(clipId: string): void {
  audioBufferStore.delete(clipId);
}

export function clearAudioBuffers(): void {
  audioBufferStore.clear();
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
export function computePeaks(buffer: AudioBuffer, numPeaks: number): number[] {
  const channelData = buffer.getChannelData(0); // mono or left channel
  const samplesPerPeak = Math.floor(channelData.length / numPeaks);
  const peaks: number[] = [];

  let maxPeak = 0;
  for (let i = 0; i < numPeaks; i++) {
    let peak = 0;
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, channelData.length);
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
