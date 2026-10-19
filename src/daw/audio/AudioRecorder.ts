import * as Tone from 'tone';
import captureProcessorUrl from './worklets/capture-processor.js?url';
import {
  createWorkletNode,
  disposeWorkletNode,
  ensureWorklet,
  supportsWorklets,
} from './graph/workletRegistry';
import { nativeContextOf, ticksAtContextTime } from './heardTime';
import {
  findLagSeconds,
  monoHead,
  placeTake,
  takeAnchor,
  type TakeAnchor,
  type TakePlacement,
} from './takePlacement';

export interface RecordingResult {
  /** Decoded PCM, used for playback + waveform rendering. */
  buffer: AudioBuffer;
  /** Compressed bytes as produced by MediaRecorder (typically Opus in WebM). */
  originalBytes: ArrayBuffer;
  /** MIME type of `originalBytes` — e.g. "audio/webm;codecs=opus". */
  originalContentType: string;
  /**
   * Where the take lands, from the capture tap's first frame (milestone 1.11
   * d, see takePlacement). Absent when the tap couldn't run (no AudioWorklet,
   * or it never heard a frame): the caller places the take as before.
   */
  placement?: TakePlacement;
}

export interface StartRecordingOptions {
  /**
   * The recorder opened `stream` (getUserMedia), so it stops the stream's
   * tracks after the take, or when the start fails. A stream that belongs to
   * someone else (a guitar or vocal adapter's tap) is left running.
   */
  ownsStream?: boolean;
  /** The recorder failed mid-take (the take is lost). */
  onError?: (error: Error) => void;
  /** When the transport starts, in context time (null when unknown). */
  transportStart?: () => number | null;
  /** The shared context; Tone's when absent. */
  context?: BaseAudioContext;
}

// ── The capture tap ─────────────────────────────────────────────────────────
// An AudioWorklet on the shared (native) context that timestamps the first
// captured frame and posts the take's first seconds
// (worklets/capture-processor.js), loaded once per context by the registry.

const CAPTURE_WORKLET_URL: string = captureProcessorUrl;
const CAPTURE_PROCESSOR = 'capture-processor';
/** How much of the take the tap posts: the alignment window and its lag. */
const ALIGN_WINDOW_SECONDS = 2;
const ALIGN_MAX_LAG_SECONDS = 0.5;
const TAP_SECONDS = ALIGN_WINDOW_SECONDS + ALIGN_MAX_LAG_SECONDS;
/** How long a stop waits for the tap's last frames. */
const TAP_STOP_TIMEOUT_MS = 500;

interface TapResult {
  anchor: TakeAnchor | null;
  pcm: Float32Array;
  sampleRate: number;
}

interface CaptureTap {
  stop(): Promise<TapResult>;
  dispose(): void;
}

/** The input's own latency where the browser says, else baseLatency. */
function inputLatencyOf(stream: MediaStream, ctx: BaseAudioContext): number {
  const track = stream.getAudioTracks?.()[0];
  const settings = track?.getSettings?.() as
    | (MediaTrackSettings & { latency?: number })
    | undefined;
  const latency = settings?.latency;
  if (typeof latency === 'number' && Number.isFinite(latency)) return latency;
  return (ctx as AudioContext).baseLatency || 0;
}

/** Starts the tap on `stream`, or null where AudioWorklet can't run. */
async function startCaptureTap(
  stream: MediaStream,
  ctx: BaseAudioContext,
  transportStart: () => number | null,
): Promise<CaptureTap | null> {
  if (typeof AudioWorkletNode === 'undefined' || !supportsWorklets(ctx)) {
    return null;
  }
  await ensureWorklet(ctx, CAPTURE_WORKLET_URL);
  const native = ctx as AudioContext;
  const source = native.createMediaStreamSource(stream);
  const node = createWorkletNode(native, CAPTURE_PROCESSOR, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: { maxFrames: Math.round(TAP_SECONDS * ctx.sampleRate) },
  });
  const chunks: Float32Array[][] = [];
  let anchor: TakeAnchor | null = null;
  let done: (() => void) | null = null;
  node.port.onmessage = (e: MessageEvent) => {
    const data = e.data as
      | { type: 'start'; contextTime: number }
      | { type: 'pcm'; channels: Float32Array[] }
      | { type: 'done' };
    if (data.type === 'start') {
      try {
        const transport = Tone.getTransport();
        anchor = takeAnchor({
          captureStart: data.contextTime,
          inputLatency: inputLatencyOf(stream, ctx),
          outputLatency: native.outputLatency || 0,
          transportStart: transportStart(),
          ticksAtTime: (time) => ticksAtContextTime(time),
          ticksPerSecond: (transport.bpm.value * transport.PPQ) / 60,
        });
      } catch (err) {
        console.warn('[recording] the take could not be timed', err);
      }
    } else if (data.type === 'pcm') {
      chunks.push(data.channels);
    } else if (data.type === 'done') {
      done?.();
    }
  };
  source.connect(node);
  // The tap passes silence on; joined to the output so the context runs it.
  node.connect(native.destination);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      source.disconnect();
    } catch {
      // Already apart.
    }
    disposeWorkletNode(node);
  };

  return {
    async stop() {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, TAP_STOP_TIMEOUT_MS);
        done = () => {
          clearTimeout(timer);
          resolve();
        };
        node.port.postMessage({ type: 'stop' });
      });
      dispose();
      const frames = chunks.reduce((sum, c) => sum + (c[0]?.length ?? 0), 0);
      const pcm = new Float32Array(frames);
      let at = 0;
      for (const chunk of chunks) {
        const mono = monoHead(chunk, chunk[0]?.length ?? 0);
        pcm.set(mono, at);
        at += mono.length;
      }
      return { anchor, pcm, sampleRate: ctx.sampleRate };
    },
    dispose,
  };
}

/** WebM/Opus, then MP4/AAC, else the browser's own choice. */
function recorderMimeType(): string | undefined {
  const isSupported = (type: string) => {
    try {
      return MediaRecorder.isTypeSupported?.(type) ?? false;
    } catch {
      return false;
    }
  };
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
    isSupported,
  );
}

function asError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  const inner = (err as { error?: unknown } | null)?.error;
  if (inner instanceof Error) return inner;
  return new Error(fallback);
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;
  private stream: MediaStream | null = null;
  private ownsStream = false;
  private tap: CaptureTap | null = null;
  private disposed = false;
  /** The pending stop's reject, for an error that arrives during it. */
  private failStop: ((error: Error) => void) | null = null;

  /**
   * Starts a take on `stream`. Resolves once MediaRecorder is recording (and
   * only then does isRecording() say so); rejects, with the stream let go
   * when the recorder owns it, when the browser can't record.
   */
  async startRecording(
    stream: MediaStream,
    options: StartRecordingOptions = {},
  ): Promise<void> {
    if (this.mediaRecorder) throw new Error('Already recording');
    this.chunks = [];
    this.stream = stream;
    this.ownsStream = options.ownsStream ?? false;
    try {
      const ctx = options.context ?? nativeContextOf(Tone.getContext());
      // The tap first, so it is listening before the bytes start: its first
      // frame places the take. Without one the take is placed as before.
      try {
        this.tap = await startCaptureTap(
          stream,
          ctx,
          options.transportStart ?? (() => null),
        );
      } catch (err) {
        console.warn('[recording] capture tap unavailable', err);
        this.tap = null;
      }
      if (this.disposed) throw new Error('Recording was cancelled');

      const mimeType = recorderMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      recorder.onerror = (e) => {
        const error = asError(e, 'The recorder stopped');
        const stopping = this.failStop;
        this.recording = false;
        this.release();
        if (stopping) stopping(error);
        else options.onError?.(error);
      };
      recorder.start(100); // collect data every 100ms
      if (recorder.state !== 'recording') {
        throw new Error('The recorder did not start');
      }
      this.mediaRecorder = recorder;
      this.recording = true;
    } catch (err) {
      this.mediaRecorder = null;
      this.release();
      throw asError(err, 'The recorder did not start');
    }
  }

  /**
   * Stop recording and resolve with the decoded buffer plus the original
   * compressed bytes. Callers should stash both in AudioBufferStore (via
   * setAudioBuffer + setOriginalAudio) so cloud save can upload the small
   * compressed form rather than re-encoding to WAV. Rejects when the take
   * can't be read back; the stream is let go either way.
   */
  async stopRecording(ctx: AudioContext): Promise<RecordingResult> {
    const recorder = this.mediaRecorder;
    if (!recorder) throw new Error('No active recording');
    const tapResult = this.tap
      ? this.tap.stop().catch(() => null)
      : Promise.resolve(null);
    this.tap = null;

    return new Promise<RecordingResult>((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.failStop = null;
        this.recording = false;
        this.mediaRecorder = null;
        this.release();
        reject(error);
      };
      this.failStop = fail;

      const finish = async () => {
        if (settled) return;
        this.recording = false;
        try {
          const originalContentType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(this.chunks, { type: originalContentType });
          // The take's bytes are in the blob now: the chunks needn't wait for
          // the next take to be let go (audio-core-08).
          this.chunks = [];
          if (blob.size === 0) throw new Error('The take is empty');
          const arrayBuffer = await blob.arrayBuffer();
          // decodeAudioData may neuter its input in some browsers; clone first
          // so we still have the original bytes to upload later.
          const originalBytes = arrayBuffer.slice(0);
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          const tap = await tapResult;
          const placement = tap?.anchor
            ? placeTake(tap.anchor, alignToTap(buffer, tap))
            : undefined;
          if (settled) return;
          settled = true;
          this.failStop = null;
          this.mediaRecorder = null;
          this.release();
          resolve({ buffer, originalBytes, originalContentType, placement });
        } catch (err) {
          fail(asError(err, 'The take could not be read'));
        }
      };

      recorder.onstop = () => void finish();
      try {
        // A recorder that has already stopped (its track ended) fires no
        // second stop event: read what it has.
        if (recorder.state === 'inactive') void finish();
        else recorder.stop();
      } catch (err) {
        fail(asError(err, 'The recorder did not stop'));
      }
    });
  }

  isRecording(): boolean {
    return this.recording;
  }

  /** Drops the take (if any) and lets the stream go when it is ours. */
  dispose(): void {
    this.disposed = true;
    this.recording = false;
    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;
    if (recorder?.state === 'recording') {
      try {
        recorder.stop();
      } catch {
        // Already stopped.
      }
    }
    this.chunks = [];
    this.release();
  }

  /** The tap comes apart, and an owned stream's tracks stop. */
  private release(): void {
    this.tap?.dispose();
    this.tap = null;
    const stream = this.stream;
    this.stream = null;
    if (stream && this.ownsStream) {
      for (const track of stream.getTracks()) track.stop();
    }
  }
}

/** The decoded take's lag from the tap (see takePlacement), 0 when the
 *  two don't line up (a silent start) or the rates differ. */
function alignToTap(buffer: AudioBuffer, tap: TapResult): number {
  if (tap.pcm.length === 0 || buffer.sampleRate !== tap.sampleRate) return 0;
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  const head = monoHead(
    channels,
    Math.round(TAP_SECONDS * buffer.sampleRate) +
      Math.round(ALIGN_MAX_LAG_SECONDS * buffer.sampleRate),
  );
  return findLagSeconds(tap.pcm, head, buffer.sampleRate, {
    windowSeconds: ALIGN_WINDOW_SECONDS,
    maxLagSeconds: ALIGN_MAX_LAG_SECONDS,
  });
}
