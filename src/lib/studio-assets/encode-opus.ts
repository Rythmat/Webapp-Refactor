import { Muxer, ArrayBufferTarget } from 'webm-muxer';

// Opus packs nicely at this bitrate — transparent for music at 96 kbps stereo,
// ~720 KB/min stereo. Picks the sweet spot of size vs. quality for studio audio.
const OPUS_BITRATE = 96_000;

// WebCodecs Opus encoder requires the sample rate to be one of these. Anything
// else (e.g. 44.1 kHz from a typical music file) is resampled via
// OfflineAudioContext before encoding.
const OPUS_SUPPORTED_SAMPLE_RATES = new Set([8000, 12000, 16000, 24000, 48000]);
const OPUS_TARGET_SAMPLE_RATE = 48_000;

export function isOpusEncodingSupported(): boolean {
  // WebCodecs has been universally shipped since Firefox 130 (Sep 2024); this
  // guard is for old browsers and worker contexts where AudioEncoder is absent.
  return (
    typeof globalThis.AudioEncoder !== 'undefined' &&
    typeof globalThis.AudioData !== 'undefined' &&
    typeof OfflineAudioContext !== 'undefined'
  );
}

/**
 * Encode an AudioBuffer as Opus inside a WebM container. Output is a Blob-ready
 * ArrayBuffer with content type `audio/webm;codecs=opus` — round-trips through
 * `decodeAudioData` in all major browsers.
 *
 * ~10x smaller than uncompressed WAV at perceptually-equivalent quality for
 * studio recordings. Used as the upload format for any audio that doesn't have
 * an already-compressed source blob to upload as-is.
 *
 * Throws if WebCodecs isn't available — callers should catch and fall back to
 * the WAV encoder.
 */
export async function audioBufferToOpusWebm(
  buffer: AudioBuffer,
): Promise<ArrayBuffer> {
  if (!isOpusEncodingSupported()) {
    throw new Error('WebCodecs AudioEncoder not available in this browser');
  }

  const sourceBuffer = OPUS_SUPPORTED_SAMPLE_RATES.has(buffer.sampleRate)
    ? buffer
    : await resampleBuffer(buffer, OPUS_TARGET_SAMPLE_RATE);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    audio: {
      codec: 'A_OPUS',
      numberOfChannels: sourceBuffer.numberOfChannels,
      sampleRate: sourceBuffer.sampleRate,
    },
  });

  // The encoder emits chunks asynchronously via the output callback; we resolve
  // when flush() returns so all chunks have been pushed to the muxer.
  let encoderError: unknown = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addAudioChunk(chunk, meta);
      } catch (err) {
        encoderError = err;
      }
    },
    error: (err) => {
      encoderError = err;
    },
  });

  encoder.configure({
    codec: 'opus',
    sampleRate: sourceBuffer.sampleRate,
    numberOfChannels: sourceBuffer.numberOfChannels,
    bitrate: OPUS_BITRATE,
  });

  // AudioData wants a single planar Float32 buffer laid out as
  // [ch0 samples..., ch1 samples..., ...]. Build it from the AudioBuffer's
  // per-channel views.
  const numFrames = sourceBuffer.length;
  const numChannels = sourceBuffer.numberOfChannels;
  const planarData = new Float32Array(numFrames * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    planarData.set(sourceBuffer.getChannelData(ch), ch * numFrames);
  }

  const audioData = new AudioData({
    format: 'f32-planar',
    sampleRate: sourceBuffer.sampleRate,
    numberOfChannels: numChannels,
    numberOfFrames: numFrames,
    timestamp: 0,
    data: planarData,
  });

  encoder.encode(audioData);
  audioData.close();

  await encoder.flush();
  encoder.close();

  if (encoderError) throw encoderError;

  muxer.finalize();
  return muxer.target.buffer;
}

async function resampleBuffer(
  buffer: AudioBuffer,
  targetRate: number,
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * targetRate),
    targetRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return await offline.startRendering();
}
