// ── Ducker: sidechain gain keyed by another track ───────────────────────────
// The ducker is the dynamics worklet in 'ducker' mode (worklets/
// dynamics-processor.js). Its first input is this chain's sound, its second
// the KEY track's post-fader tap (resolved by id through an injected
// callback), so the duck follows the key sample by sample, live and in an
// offline render. Its node is made when the ducker is first switched on and
// let go when it goes off:
//
//   off, or still loading:  duck gain → destination
//   on:                     duck gain → ducker worklet → destination
//                           key tap ──↗ (input 1)
//
// The duck gain is the module's input, a unity gain at the boundary with
// the multiband. Not automatable: the parameters follow update().

import type { AutomationTarget } from '../../automation';
import type { DuckerParams } from '../../EffectChain';
import {
  createWorkletNode,
  disposeWorkletNode,
  DYNAMICS_PROCESSOR,
  DYNAMICS_WORKLET_URL,
  ensureWorklet,
  isWorkletReady,
  supportsWorklets,
} from '../workletRegistry';
import { safeVal, setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

/** Resolves a key track's post-fader tap by id, or null. */
export type KeySourceResolver = (trackId: string) => AudioNode | null;

/** The worklet's AudioParams, from the ducker's state. */
function duckerParams(d: DuckerParams): Record<string, number> {
  return {
    threshold: safeVal(d.threshold, -30),
    amount: Math.max(0, Math.min(1, safeVal(d.amount, 0.3))),
    attack: safeVal(d.attack, 0.01),
    release: safeVal(d.release, 0.2),
  };
}

export class DuckerModule implements EffectModule<DuckerParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  private readonly duckGain: GainNode;
  private state: DuckerParams;
  private node: AudioWorkletNode | null = null;
  private loading: Promise<void> | null = null;
  private destination: AudioNode | null = null;
  private keySourceResolver: KeySourceResolver | null = null;
  /** The key tap connected to the node's second input. */
  private key: AudioNode | null = null;
  private reductionDb = 0; // current reduction for the GR meter (≤ 0)
  private disposed = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    initial: DuckerParams,
  ) {
    this.state = structuredClone(initial);
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1;
    this.input = this.duckGain;
  }

  /**
   * duck gain → (worklet →) destination. The edges stay: unwire() leaves
   * them, and connecting them again is a no-op.
   */
  wire(_source: AudioNode, destination: AudioNode): void {
    this.destination = destination;
    if (this.node) {
      this.duckGain.connect(this.node);
      this.node.connect(destination);
    } else {
      this.duckGain.connect(destination);
    }
  }

  unwire(): void {
    /* the duck path's edges stay (see wire) */
  }

  setKeySourceResolver(fn: KeySourceResolver): void {
    this.keySourceResolver = fn;
    this.refreshKey();
  }

  /**
   * Connects the key track's current tap to the ducker, or none. Called when
   * the key may have changed: an update, a new resolver, and whenever the
   * track engines are made again (a key track's new engine has a new tap; an
   * engine that goes takes its edge with it).
   */
  refreshKey(): void {
    const node = this.node;
    const { keyTrackId } = this.state;
    const next =
      node && keyTrackId && this.keySourceResolver
        ? this.keySourceResolver(keyTrackId)
        : null;
    if (next === this.key) return;
    if (this.key && node) tryDisconnect(this.key, node);
    this.key = null;
    if (next && node) {
      next.connect(node, 0, 1);
      this.key = next;
    }
  }

  /** Current sidechain gain reduction in dB (≤ 0) for the GR meter. */
  getReduction(): number {
    return this.reductionDb;
  }

  update(d: DuckerParams, opts: EffectUpdateOptions): void {
    this.state = structuredClone(d);
    if (!d.enabled) {
      this.release();
      return;
    }
    if (this.node) {
      this.applyParams(opts.glide);
      this.refreshKey();
    } else if (isWorkletReady(this.ctx, DYNAMICS_WORKLET_URL)) {
      this.attach();
    } else {
      this.load();
    }
  }

  /** Resolves once a ducker switched on is in the path (or failed to load). */
  whenReady(): Promise<void> {
    return this.loading ?? Promise.resolve();
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.disposed = true;
    this.release();
    this.duckGain.disconnect();
  }

  // Loads the worklet module; until it is in, the sound passes unchanged.
  private load(): void {
    if (this.loading || !supportsWorklets(this.ctx)) return;
    this.loading = ensureWorklet(this.ctx, DYNAMICS_WORKLET_URL)
      .then(() => {
        if (!this.disposed && this.state.enabled && !this.node) this.attach();
      })
      .catch((err: unknown) => {
        console.warn('[Ducker] dynamics worklet failed to load:', err);
      })
      .finally(() => {
        this.loading = null;
      });
  }

  // Makes the ducker's node, puts it in the path and connects its key.
  private attach(): void {
    const node = createWorkletNode(this.ctx, DYNAMICS_PROCESSOR, {
      numberOfInputs: 2,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { mode: 'ducker' },
      parameterData: duckerParams(this.state),
    });
    node.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'gr') this.reductionDb = e.data.db;
    };
    this.node = node;
    if (this.destination) {
      tryDisconnect(this.duckGain, this.destination);
      this.duckGain.connect(node);
      node.connect(this.destination);
    } else {
      this.duckGain.connect(node);
    }
    this.refreshKey();
  }

  // Takes the ducker out of the path and lets its node (and key edge) go.
  private release(): void {
    const node = this.node;
    if (!node) return;
    this.node = null;
    this.reductionDb = 0;
    if (this.key) tryDisconnect(this.key, node);
    this.key = null;
    tryDisconnect(this.duckGain, node);
    if (this.destination) this.duckGain.connect(this.destination);
    disposeWorkletNode(node);
  }

  private applyParams(glide: boolean): void {
    const node = this.node;
    if (!node) return;
    for (const [name, value] of Object.entries(duckerParams(this.state))) {
      const param = node.parameters.get(name);
      if (param) setParam(this.ctx, param, value, glide);
    }
  }
}
