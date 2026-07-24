/**
 * Encode an AudioBuffer as PCM WAV. Used at save time to materialize in-memory
 * clips (recordings, file drops, generated audio) into uploadable bytes —
 * AudioBuffer is decoded PCM and has no inherent file format — and by the
 * audio-mixdown export (File → Export Audio), which also wants 24-bit.
 *
 * WAV is uncompressed; expect ~10 MB per minute of stereo 44.1kHz at 16-bit
 * (~15 MB at 24-bit). Well within the 100 MB asset cap for typical clips.
 *
 * `bitDepth` defaults to 16 so existing callers are unchanged; pass 24 for a
 * higher-resolution mixdown.
 */
export function audioBufferToWav(
  buffer: AudioBuffer,
  bitDepth: 16 | 24 = 16,
): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = bitDepth === 24 ? 3 : 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;

  const out = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(out);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  writeAscii(view, 8, 'WAVE');

  // fmt chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true); // bits per sample

  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write signed PCM samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  if (bitDepth === 24) {
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        // Asymmetric: Float32 [-1, 1] → Int24 [-8388608, 8388607]
        const intSample = Math.round(
          sample < 0 ? sample * 0x800000 : sample * 0x7fffff,
        );
        // Little-endian 3-byte signed
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      }
    }
  } else {
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        // Asymmetric: Float32 [-1, 1] → Int16 [-32768, 32767]
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  }

  return out;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
