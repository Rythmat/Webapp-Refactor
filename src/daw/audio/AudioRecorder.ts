import * as Tone from 'tone';
import captureProcessorUrl from './worklets/capture-processor.js?url';
import {
  createWorkletNode,
  disposeWorkletNode,
  ensureWorklet,
  isWorkletReady,
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
  /**
   * Without a placement: how much of the take was recorded before the
   * transport's start (a count-in's recorder starts a little ahead of the
   * downbeat), to trim off. 0 when none, or when the start isn't known.
   */
  leadSeconds: number;
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
  /** The input's latency in seconds, when the caller knows it better than
   *  the stream's settings do (see takePlacement). */
  inputLatency?: number;
}

// ── The capture tap ─────────────────────────────────────────────────────────
// An AudioWorklet on the shared (native) context that timestamps the first
// captured frame and posts the take's first seconds
// (worklets/capture-processor.js), loaded once per context by the registry.

const CAPTURE_WORKLET_URL: string = captureProcessorUrl;
const CAPTURE_PROCESSOR = 'capture-processor';
/** The decoded audio's plausible lag from the tap when the tap starts first
 *  (MediaRecorder's start-up makes it later), in seconds; shifted by how much
 *  later the tap started when it didn't. See findLagSeconds. */
const ALIGN_WINDOW_SECONDS = 2;
const ALIGN_MIN_LAG_SECONDS = -0.15;
const ALIGN_MAX_LAG_SECONDS = 0.02;
/** How much of the take the tap posts: the window, past the earliest lag. */
const TAP_SECONDS = ALIGN_WINDOW_SECONDS + 0.5;
/** How long a stop waits for the tap's last frames. */
const TAP_STOP_TIMEOUT_MS = 500;

interface TapResult {
  anchor: TakeAnchor | null;
  pcm: Float32Array;
  sampleRate: number;
  /** performance.now() when the tap was joined to the stream. */
  startedAt: number;
}

interface CaptureTap {
  stop(): Promise<TapResult>;
  dispose(): void;
}

/** The input's own latency where the browser says, else 0 (takePlacement). */
function inputLatencyOf(stream: MediaStream): number {
  const track = stream.getAudioTracks?.()[0];
  const settings = track?.getSettings?.() as
    | (MediaTrackSettings & { latency?: number })
    | undefined;
  const latency = settings?.latency;
  return typeof latency === 'number' && Number.isFinite(latency) ? latency : 0;
}

/** Loads the capture tap's module on `ctx` ahead of a take, so the tap is
 *  listening before the recorder starts. Failures are left to the take. */
export function prepareRecording(ctx: BaseAudioContext): void {
  if (typeof AudioWorkletNode === 'undefined' || !supportsWorklets(ctx)) {
    return;
  }
  ensureWorklet(ctx, CAPTURE_WORKLET_URL).catch(() => {});
}

/** Starts the tap on `stream`, or null where AudioWorklet can't run. */
async function startCaptureTap(
  stream: MediaStream,
  ctx: BaseAudioContext,
  transportStart: () => number | null,
  inputLatency: number | undefined,
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
          inputLatency: inputLatency ?? inputLatencyOf(stream),
          baseLatency: native.baseLatency || 0,
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
  const startedAt = performance.now();

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
      return { anchor, pcm, sampleRate: ctx.sampleRate, startedAt };
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
  private stopping = false;
  /** performance.now() and context time when MediaRecorder started. */
  private recorderStartedAt = 0;
  private recorderStartTime = 0;
  /** The transport's start as read just after the recorder started. */
  private transportStartAtTake: number | null = null;
  /** The pending stop's reject, for an error that arrives during it. */
  private failStop: ((error: Error) => void) | null = null;

  /**
   * Starts a take on `stream`. Resolves once MediaRecorder is recording (and
   * only then does isRecording() say so); rejects, with the stream let go
   * when the recorder owns it, when the browser can't record.
   *
   * The capture tap (which places the take) starts first when its module is
   * loaded (prepareRecording); otherwise the recorder doesn't wait for it, so
   * a Stop during the load still keeps the take, placed as before.
   */
  async startRecording(
    stream: MediaStream,
    options: StartRecordingOptions = {},
  ): Promise<void> {
    if (this.mediaRecorder) throw new Error('Already recording');
    this.chunks = [];
    this.stream = stream;
    this.ownsStream = options.ownsStream ?? false;
    const transportStart = options.transportStart ?? (() => null);
    try {
      const ctx = options.context ?? nativeContextOf(Tone.getContext());
      const tapReady = startCaptureTap(
        stream,
        ctx,
        transportStart,
        options.inputLatency,
      )
        .catch((err: unknown) => {
          console.warn('[recording] capture tap unavailable', err);
          return null;
        })
        .then((tap) => {
          // A take that ended (or never started) while the module loaded.
          if (tap && (this.stopping || this.disposed || !this.stream)) {
            tap.dispose();
            return null;
          }
          this.tap = tap;
          return tap;
        });
      if (isWorkletReady(ctx, CAPTURE_WORKLET_URL)) await tapReady;
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
      this.recorderStartedAt = performance.now();
      this.recorderStartTime = (ctx as AudioContext).currentTime ?? 0;
      // The transport may be started by an effect that runs after this one
      // (a joint play+record start): read its start once that has happened.
      this.transportStartAtTake = transportStart();
      setTimeout(() => {
        if (this.transportStartAtTake === null) {
          this.transportStartAtTake = transportStart();
        }
      }, 0);
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
    this.stopping = true;
    const tapResult = this.tap
      ? this.tap.stop().catch(() => null)
      : Promise.resolve(null);
    this.tap = null;
    const transportStart = this.transportStartAtTake;
    const leadSeconds =
      transportStart !== null
        ? Math.max(0, transportStart - this.recorderStartTime)
        : 0;
    const recorderStartedAt = this.recorderStartedAt;

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
            ? placeTake(tap.anchor, alignToTap(buffer, tap, recorderStartedAt))
            : undefined;
          if (settled) return;
          settled = true;
          this.failStop = null;
          this.mediaRecorder = null;
          this.release();
          resolve({
            buffer,
            originalBytes,
            originalContentType,
            placement,
            leadSeconds,
          });
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

/**
 * The decoded take's lag from the tap (see takePlacement), 0 when the two
 * don't line up (a silent start) or the rates differ. The search range is
 * shifted by how much later than MediaRecorder the tap started (its module
 * still loading), which makes the decoded audio start that much earlier.
 */
function alignToTap(
  buffer: AudioBuffer,
  tap: TapResult,
  recorderStartedAt: number,
): number {
  if (tap.pcm.length === 0 || buffer.sampleRate !== tap.sampleRate) return 0;
  const skew = (tap.startedAt - recorderStartedAt) / 1000;
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  const head = monoHead(
    channels,
    Math.round(
      (TAP_SECONDS + Math.max(0, skew + ALIGN_MAX_LAG_SECONDS)) *
        buffer.sampleRate,
    ),
  );
  return findLagSeconds(tap.pcm, head, buffer.sampleRate, {
    windowSeconds: ALIGN_WINDOW_SECONDS,
    minLagSeconds: skew + ALIGN_MIN_LAG_SECONDS,
    maxLagSeconds: skew + ALIGN_MAX_LAG_SECONDS,
    preferLagSeconds: skew,
  });
}
