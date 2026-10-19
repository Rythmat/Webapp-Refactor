// ── encodeAudio ───────────────────────────────────────────────────────────
// The export's encoder (milestone 1.11): a rendered AudioBuffer to the bytes
// of a WAV (16 or 24-bit) or Opus file, in a module worker so a long song
// doesn't freeze the page while it is written. The worker runs the page's own
// encoders on copies of the channels, so a WAV is byte for byte the one the
// page writes. Opus at a rate the encoder doesn't take is resampled here
// first (an OfflineAudioContext, which workers don't have).
//
// Where a worker can't be made (old browsers, jsdom) or fails to start, the
// page encodes, as audio/peaks.ts does for waveforms. A worker without
// WebCodecs hands Opus back to the page. Each job has a worker of its own,
// ended when the job is: an abort ends it at once.

import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import {
  audioBufferToOpusWebm,
  isOpusEncodingSupported,
  opusReadyBuffer,
} from '@/lib/studio-assets/encode-opus';
import type { EncodeRequest, EncodeResponse } from '../workers/encodeWorker';

export type EncodeFormat = 'wav' | 'opus';

/** Set once a worker could not be made or failed to start: the page encodes
 *  from then on. */
let workerUnavailable = false;
let nextJob = 1;

function abortError(): DOMException {
  return new DOMException('Stopped', 'AbortError');
}

/** The bytes the page itself writes for `buffer`. */
function encodeOnPage(
  buffer: AudioBuffer,
  format: EncodeFormat,
  bitDepth: 16 | 24,
): Promise<ArrayBuffer> | ArrayBuffer {
  return format === 'wav'
    ? audioBufferToWav(buffer, bitDepth)
    : audioBufferToOpusWebm(buffer);
}

function openWorker(): Worker | null {
  if (workerUnavailable || typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../workers/encodeWorker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    workerUnavailable = true;
    return null;
  }
}

/**
 * `buffer` encoded as `format`: in a worker where there is one, else on the
 * page. `signal` aborts it with an AbortError (the worker is ended).
 */
export async function encodeAudioBuffer(
  buffer: AudioBuffer,
  format: EncodeFormat,
  bitDepth: 16 | 24 = 16,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  if (signal?.aborted) throw abortError();
  // Without Opus on the page there is nothing to resample with: the page's
  // encoder says why.
  if (format === 'opus' && !isOpusEncodingSupported()) {
    return encodeOnPage(buffer, format, bitDepth);
  }
  const worker = openWorker();
  if (!worker) return encodeOnPage(buffer, format, bitDepth);

  let source = buffer;
  try {
    if (format === 'opus') source = await opusReadyBuffer(buffer);
    if (signal?.aborted) throw abortError();
  } catch (err) {
    worker.terminate();
    throw err;
  }

  // Copies, made now: an AudioBuffer's own data cannot be transferred.
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    channels.push(source.getChannelData(ch).slice());
  }
  const request: EncodeRequest = {
    id: nextJob++,
    format,
    bitDepth,
    sampleRate: source.sampleRate,
    length: source.length,
    channels,
  };

  const answer = await new Promise<EncodeResponse | 'page'>(
    (resolve, reject) => {
      const onAbort = () => {
        finish();
        reject(abortError());
      };
      const finish = () => {
        signal?.removeEventListener('abort', onAbort);
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      worker.onmessage = (event: MessageEvent<EncodeResponse>) => {
        if (event.data.id !== request.id) return;
        finish();
        resolve(event.data);
      };
      // The worker didn't start (or its module didn't load): the page
      // encodes this one and every one after.
      worker.onerror = (event) => {
        event.preventDefault();
        workerUnavailable = true;
        finish();
        resolve('page');
      };
      worker.onmessageerror = () => {
        finish();
        resolve('page');
      };
      try {
        worker.postMessage(
          request,
          channels.map((c) => c.buffer as ArrayBuffer),
        );
      } catch {
        finish();
        resolve('page');
      }
    },
  );

  if (answer === 'page') return encodeOnPage(source, format, bitDepth);
  if ('bytes' in answer) return answer.bytes;
  if (answer.unsupported) return encodeOnPage(source, format, bitDepth);
  throw new Error(answer.error);
}

/** For tests: forget that a worker failed. */
export function resetEncodeWorkerForTests(): void {
  workerUnavailable = false;
}
