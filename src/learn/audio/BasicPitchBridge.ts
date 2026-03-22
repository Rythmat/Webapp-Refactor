// ── BasicPitchBridge ─────────────────────────────────────────────────────
// Main-thread bridge to the basic-pitch Web Worker. Spawns the worker,
// feeds audio data, and exposes ML predictions for use by the adapter.

// ── Types ────────────────────────────────────────────────────────────────

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

export type MLCorrectionCallback = (
  activeKeys: number[],
  onsets: number[],
) => void;

// ── Class ────────────────────────────────────────────────────────────────

export class BasicPitchBridge {
  private worker: Worker | null = null;
  private _isReady = false;
  private _error: string | null = null;

  // Latest ML predictions
  private _activeKeys = new Set<number>();
  private _onsets = new Set<number>();
  private _lastUpdateTime = 0;

  // Callback for when ML produces new results
  private onCorrection: MLCorrectionCallback | null = null;

  /** Initialize the worker and load the model. */
  start(): void {
    if (this.worker) return;

    try {
      this.worker = new Worker(
        new URL('./BasicPitchWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        this.handleMessage(e.data);
      };

      this.worker.onerror = (e) => {
        this._error = e.message;
        console.error('[BasicPitchBridge] Worker error:', e.message);
      };

      this.worker.postMessage({ type: 'init' });
    } catch (err) {
      this._error = `Failed to create worker: ${err}`;
      console.error('[BasicPitchBridge]', this._error);
    }
  }

  /** Set callback for ML correction events. */
  setOnCorrection(cb: MLCorrectionCallback): void {
    this.onCorrection = cb;
  }

  /** Feed audio samples to the worker for accumulation + inference. */
  feedAudio(samples: Float32Array, sampleRate: number): void {
    if (!this.worker || !this._isReady) return;

    // Copy buffer before transferring ownership
    const copy = new Float32Array(samples);
    this.worker.postMessage({ type: 'audio', samples: copy, sampleRate }, [
      copy.buffer,
    ]);
  }

  /** Get currently active MIDI notes from ML model. */
  getActiveKeys(): Set<number> {
    return this._activeKeys;
  }

  /** Get latest onset MIDI notes from ML model. */
  getLatestOnsets(): Set<number> {
    return this._onsets;
  }

  /** Whether the model is loaded and ready. */
  get isReady(): boolean {
    return this._isReady;
  }

  /** Time of the last ML update (performance.now()). */
  get lastUpdateTime(): number {
    return this._lastUpdateTime;
  }

  /** Any initialization error. */
  get error(): string | null {
    return this._error;
  }

  /** Stop the worker and release resources. */
  stop(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }
    this._isReady = false;
    this._activeKeys.clear();
    this._onsets.clear();
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private handleMessage(msg: WorkerOutMessage): void {
    switch (msg.type) {
      case 'ready':
        this._isReady = true;
        this._error = null;
        break;

      case 'notes': {
        this._activeKeys = new Set(msg.activeKeys);
        this._onsets = new Set(msg.onsets);
        this._lastUpdateTime = performance.now();
        this.onCorrection?.(msg.activeKeys, msg.onsets);
        break;
      }

      case 'error':
        this._error = msg.message;
        console.warn('[BasicPitchBridge] ML error:', msg.message);
        break;
    }
  }
}
