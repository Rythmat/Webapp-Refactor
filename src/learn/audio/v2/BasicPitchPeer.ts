// ── BasicPitchPeer ────────────────────────────────────────────────────────
// ML model as a peer observer in the probabilistic pipeline.
//
// Unlike v1's BasicPitchBridge (correction-only role), this module:
//   - Outputs PitchDistribution (same format as DSP streams)
//   - Feeds into ObservationModel.fuse() alongside FastPitch/HiResPitch
//   - Uses AudioWorklet for audio capture (not ScriptProcessorNode)
//   - ML Worker handles inference (TF.js needs WebGL, can't run in worklet)
//
// Architecture:
//   source → AudioWorkletNode (basic-pitch-capture) → MessagePort → this
//   this → Worker (BasicPitchWorker.ts) → TF.js inference → this
//   this → PitchDistribution for fusion

import {
  NUM_STATES,
  SILENCE_STATE,
  MIDI_OFFSET,
  normalizeDistribution,
  type PitchDistribution,
} from './types';

// ── Types ─────────────────────────────────────────────────────────────────

interface WorkerNoteMessage {
  type: 'notes';
  activeKeys: number[];
  onsets: number[];
}

interface WorkerReadyMessage {
  type: 'ready';
}

interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

type WorkerOutMessage =
  | WorkerNoteMessage
  | WorkerReadyMessage
  | WorkerErrorMessage;

// ── Constants ─────────────────────────────────────────────────────────────

/** Probability assigned to each active key from ML model. */
const ACTIVE_KEY_PROB = 0.3;

/** Probability assigned to each onset key (higher than active). */
const ONSET_KEY_PROB = 0.6;

/** Base silence probability when ML detects notes. */
const ML_SILENCE_FLOOR = 0.05;

/** Worklet URL (relative to public directory). */
const WORKLET_URL = '/daw-assets/basic-pitch-worklet.js';

// ── Class ─────────────────────────────────────────────────────────────────

export class BasicPitchPeer {
  private worker: Worker | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _isReady = false;
  private _error: string | null = null;

  /** Latest ML prediction as a PitchDistribution. */
  private latestDistribution: PitchDistribution | null = null;

  /** Frame counter for distributions. */
  private frameId = 0;

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Start the ML pipeline: load AudioWorklet + spawn inference Worker.
   */
  async start(
    audioContext: AudioContext,
    sourceNode: AudioNode,
  ): Promise<void> {
    try {
      // 1. Load and register the AudioWorklet
      await audioContext.audioWorklet.addModule(WORKLET_URL);

      // 2. Create worklet node
      const workletNode = new AudioWorkletNode(
        audioContext,
        'basic-pitch-capture',
      );
      sourceNode.connect(workletNode);
      // Worklet must be connected to destination to process
      workletNode.connect(audioContext.destination);
      this.workletNode = workletNode;

      // 3. Spawn inference Worker (reuses existing BasicPitchWorker)
      this.worker = new Worker(
        new URL('../BasicPitchWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (e) => {
        this._error = e.message;
      };

      // Initialize the ML model in the worker
      this.worker.postMessage({ type: 'init' });

      // 4. Wire worklet → worker: forward audio chunks
      workletNode.port.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'audio' && this.worker && this._isReady) {
          // Forward audio to inference worker
          this.worker.postMessage(
            {
              type: 'audio',
              samples: msg.samples,
              sampleRate: msg.sampleRate,
            },
            [msg.samples.buffer],
          );
        }
      };
    } catch (err) {
      this._error = `Failed to start BasicPitchPeer: ${err}`;

      // Fallback: use ScriptProcessorNode if AudioWorklet fails
      this.startFallback(audioContext, sourceNode);
    }
  }

  /** Stop the ML pipeline and release resources. */
  stop(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'stop' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }

    this._isReady = false;
    this.latestDistribution = null;
  }

  /**
   * Get the latest ML prediction as a PitchDistribution.
   * Returns null if no prediction available yet.
   */
  getLatestDistribution(): PitchDistribution | null {
    return this.latestDistribution;
  }

  /** Whether the ML model is loaded and ready. */
  get isReady(): boolean {
    return this._isReady;
  }

  /** Any initialization error. */
  get error(): string | null {
    return this._error;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Handle messages from the inference Worker. */
  private handleWorkerMessage(msg: WorkerOutMessage): void {
    switch (msg.type) {
      case 'ready':
        this._isReady = true;
        this._error = null;
        break;

      case 'notes':
        this.latestDistribution = this.notesToDistribution(
          msg.activeKeys,
          msg.onsets,
        );
        break;

      case 'error':
        this._error = msg.message;
        break;
    }
  }

  /**
   * Convert ML active keys and onsets into a PitchDistribution.
   * Onset keys get higher probability than merely active keys.
   */
  private notesToDistribution(
    activeKeys: number[],
    onsets: number[],
  ): PitchDistribution {
    const probs = new Float64Array(NUM_STATES);
    const id = this.frameId++;
    const now = performance.now();

    if (activeKeys.length === 0 && onsets.length === 0) {
      // No detection: high silence probability
      probs[SILENCE_STATE] = 1;
      return { probs, timestamp: now, frameId: id };
    }

    // Start with silence floor
    probs[SILENCE_STATE] = ML_SILENCE_FLOOR;

    // Onset keys get highest probability
    const onsetSet = new Set(onsets);
    for (const midi of onsets) {
      const state = midi - MIDI_OFFSET;
      if (state >= 0 && state < 88) {
        probs[state] = ONSET_KEY_PROB;
      }
    }

    // Active (non-onset) keys get lower probability
    for (const midi of activeKeys) {
      const state = midi - MIDI_OFFSET;
      if (state >= 0 && state < 88 && !onsetSet.has(midi)) {
        probs[state] = ACTIVE_KEY_PROB;
      }
    }

    normalizeDistribution(probs);

    return { probs, timestamp: now, frameId: id };
  }

  /**
   * Fallback: use ScriptProcessorNode if AudioWorklet fails.
   * This mirrors the v1 approach but converts output to PitchDistribution.
   */
  private startFallback(
    audioContext: AudioContext,
    sourceNode: AudioNode,
  ): void {
    try {
      // Spawn worker
      this.worker = new Worker(
        new URL('../BasicPitchWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (e) => {
        this._error = e.message;
      };

      this.worker.postMessage({ type: 'init' });

      // Use ScriptProcessorNode as fallback audio tap
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      sourceNode.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!this.worker || !this._isReady) return;
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input);
        this.worker.postMessage(
          {
            type: 'audio',
            samples: copy,
            sampleRate: audioContext.sampleRate,
          },
          [copy.buffer],
        );
      };
    } catch {
      // ML will simply not be available — other streams still function
    }
  }
}
