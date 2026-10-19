// ── NamWorkletNode ────────────────────────────────────────────────────────
// TypeScript wrapper around the nam-processor AudioWorklet.
// Handles registration, model loading (with zero-copy transfer), and messaging.

import { getModelDisplayName, type NamModelFile } from './NamModelParser';
import {
  createWorkletNode,
  disposeWorkletNode,
  ensureWorklet,
} from '../graph/workletRegistry';

const NAM_WORKLET_URL = '/daw-assets/nam-processor.js';

export class NamWorkletNode {
  private ctx: BaseAudioContext;
  private node: AudioWorkletNode | null = null;
  private disposed = false;
  private _loaded = false;
  private _modelName: string | null = null;
  private _loadResolve: (() => void) | null = null;
  private _loadReject: ((err: Error) => void) | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }

  /**
   * Loads the processor (once per context, through the worklet registry) and
   * makes the node. Rejects if dispose() came first: the node that would
   * have arrived late is never made.
   */
  async init(): Promise<void> {
    // Caller (GuitarPedalChain) passes the native AudioContext directly.
    // An offline context starts when it renders, not on resume().
    const live = this.ctx as AudioContext;
    if (this.ctx.state === 'suspended' && typeof live.close === 'function') {
      await live.resume();
    }

    await ensureWorklet(this.ctx, NAM_WORKLET_URL);
    if (this.disposed) throw new Error('[NAM] node disposed during init');

    this.node = createWorkletNode(this.ctx, 'nam-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1], // mono
    });

    // Surface worklet-level errors
    this.node.addEventListener('processorerror', (e) => {
      console.error('[NAM] Worklet processor error:', e);
    });

    this.node.port.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'model-loaded') {
        this._loaded = true;
        this._loadResolve?.();
        this._loadResolve = null;
        this._loadReject = null;
      } else if (data.type === 'error') {
        console.error('[NAM] Processor error:', data.message);
        this._loadReject?.(new Error(data.message));
        this._loadResolve = null;
        this._loadReject = null;
      }
    };
  }

  async loadModel(model: NamModelFile): Promise<void> {
    if (!this.node)
      throw new Error('NamWorkletNode not initialized — call init() first');

    // Convert to Float32Array for efficient transfer
    const weights = new Float32Array(model.weights);

    this._loaded = false;
    this._modelName = getModelDisplayName(model);

    // Wait for worklet to confirm model is loaded (including prewarm)
    const loadPromise = new Promise<void>((resolve, reject) => {
      this._loadResolve = resolve;
      this._loadReject = reject;
    });

    // Timeout: surface hangs as errors (mirrors SoundFontAdapter pattern)
    const timeout = setTimeout(() => {
      if (this._loadReject) {
        this._loadReject(new Error('[NAM] Model load timed out after 30s'));
        this._loadResolve = null;
        this._loadReject = null;
      }
    }, 30_000);

    this.node.port.postMessage(
      {
        type: 'load-model',
        model: {
          architecture: model.architecture,
          config: model.config,
          weights,
        },
      },
      [weights.buffer], // Transfer ownership (zero-copy)
    );

    try {
      await loadPromise;
    } finally {
      clearTimeout(timeout);
    }
  }

  setInputLevel(value: number): void {
    this.node?.port.postMessage({ type: 'set-input-level', value });
  }

  setOutputLevel(value: number): void {
    this.node?.port.postMessage({ type: 'set-output-level', value });
  }

  setBypass(bypassed: boolean): void {
    this.node?.port.postMessage({ type: 'bypass', value: bypassed });
  }

  getNode(): AudioWorkletNode {
    if (!this.node) throw new Error('NamWorkletNode not initialized');
    return this.node;
  }

  isLoaded(): boolean {
    return this._loaded;
  }

  getModelName(): string | null {
    return this._modelName;
  }

  /** Tells the processor to stop (process() returns false) and lets go. */
  dispose(): void {
    this.disposed = true;
    if (this.node) disposeWorkletNode(this.node);
    this.node = null;
    this._loadReject?.(new Error('[NAM] node disposed'));
    this._loadResolve = null;
    this._loadReject = null;
    this._loaded = false;
    this._modelName = null;
  }
}
