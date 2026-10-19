/**
 * The export's encode worker. It turns a rendered mix (copies of its channels
 * that the page transfers here) into the bytes of a WAV or Opus file off the
 * main thread, and transfers the bytes back.
 *
 * The maths is pcmToWav and pcmToOpusWebm in `lib/studio-assets/`, the very
 * functions the page uses, so a file is byte for byte what the page would
 * write. Opus needs WebCodecs in the worker; without it the worker says so and
 * the page encodes it. The page creates the worker in `audio/encodeAudio.ts`.
 */
import { pcmToWav } from '@/lib/studio-assets/encode-wav';
import {
  canEncodeOpusHere,
  pcmToOpusWebm,
} from '@/lib/studio-assets/encode-opus';

export interface EncodeRequest {
  id: number;
  format: 'wav' | 'opus';
  /** WAV only. */
  bitDepth?: 16 | 24;
  sampleRate: number;
  length: number;
  channels: Float32Array[];
}

export type EncodeResponse =
  | { id: number; bytes: ArrayBuffer }
  /** `unsupported`: this worker can't encode the format (Opus without
   *  WebCodecs here); the page then does. */
  | { id: number; error: string; unsupported?: boolean };

/** The answer to one request. */
export async function runEncodeRequest(
  request: EncodeRequest,
): Promise<EncodeResponse> {
  const { id, format, bitDepth, sampleRate, length, channels } = request;
  try {
    if (format === 'wav') {
      return { id, bytes: pcmToWav(channels, sampleRate, length, bitDepth) };
    }
    if (!canEncodeOpusHere()) {
      return { id, error: 'No WebCodecs in the worker', unsupported: true };
    }
    return { id, bytes: await pcmToOpusWebm(channels, sampleRate, length) };
  } catch (error) {
    return {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface WorkerScope {
  postMessage(message: EncodeResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<EncodeRequest>) => void) | null;
}

// Only as a worker: a test imports this file for runEncodeRequest.
const isWorker =
  typeof self !== 'undefined' &&
  typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !==
    'undefined';

if (isWorker) {
  const scope = self as unknown as WorkerScope;
  scope.onmessage = (event) => {
    void runEncodeRequest(event.data).then((response) =>
      scope.postMessage(response, 'bytes' in response ? [response.bytes] : []),
    );
  };
}
