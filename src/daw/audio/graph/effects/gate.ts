// ── Gate: a noise gate on the audio thread ──────────────────────────────────
// The gate is the dynamics worklet in 'gate' mode (worklets/
// dynamics-processor.js): a sample-accurate peak detector and gain, the same
// in a live chain and an offline render. Its node is made when the gate is
// first switched on (the worklet module loads then, once per context) and
// let go when it goes off, so an off gate is out of the path:
//
//   off, or still loading:  source → output
//   on:                     source → gate worklet → output
//
// `output` is a unity gain the module owns, the boundary with the
// compressor. Not automatable: the parameters follow update().

import type { AutomationTarget } from '../../automation';
import type { GateParams } from '../../EffectChain';
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

/** The worklet's AudioParams, from the gate's state. */
function gateParams(g: GateParams): Record<string, number> {
  return {
    threshold: safeVal(g.threshold, -40),
    range: safeVal(g.range, 40),
    hold: safeVal(g.hold, 0.01),
    attack: safeVal(g.attack, 0.001),
    release: safeVal(g.release, 0.1),
  };
}

export class GateModule implements EffectModule<GateParams> {
  readonly input = null;
  readonly output: GainNode;
  readonly latencySeconds = 0;
  private state: GateParams;
  private node: AudioWorkletNode | null = null;
  private loading: Promise<void> | null = null;
  private source: AudioNode | null = null;
  private reductionDb = 0;
  private disposed = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    initial: GateParams,
  ) {
    this.state = structuredClone(initial);
    this.output = ctx.createGain();
    this.output.gain.value = 1;
  }

  wire(source: AudioNode): void {
    this.source = source;
    if (this.node) {
      source.connect(this.node);
      this.node.connect(this.output);
    } else {
      source.connect(this.output);
    }
  }

  unwire(): void {
    this.output.disconnect();
    if (this.node) tryDisconnect(this.node);
  }

  update(gate: GateParams, opts: EffectUpdateOptions): void {
    this.state = structuredClone(gate);
    if (!gate.enabled) {
      this.release();
      return;
    }
    if (this.node) {
      this.applyParams(opts.glide);
    } else if (isWorkletReady(this.ctx, DYNAMICS_WORKLET_URL)) {
      this.attach();
    } else {
      this.load();
    }
  }

  /** Resolves once a gate switched on is in the path (or failed to load). */
  whenReady(): Promise<void> {
    return this.loading ?? Promise.resolve();
  }

  /** The gate's current gain reduction in dB (≤ 0). */
  getReduction(): number {
    return this.reductionDb;
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.disposed = true;
    this.release();
    this.output.disconnect();
  }

  // Loads the worklet module; until it is in, the sound passes unchanged.
  private load(): void {
    if (this.loading || !supportsWorklets(this.ctx)) return;
    this.loading = ensureWorklet(this.ctx, DYNAMICS_WORKLET_URL)
      .then(() => {
        if (!this.disposed && this.state.enabled && !this.node) this.attach();
      })
      .catch((err: unknown) => {
        console.warn('[Gate] dynamics worklet failed to load:', err);
      })
      .finally(() => {
        this.loading = null;
      });
  }

  // Makes the gate's node and puts it in the path.
  private attach(): void {
    const node = createWorkletNode(this.ctx, DYNAMICS_PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { mode: 'gate' },
      parameterData: gateParams(this.state),
    });
    node.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'gr') this.reductionDb = e.data.db;
    };
    this.node = node;
    if (this.source) {
      tryDisconnect(this.source, this.output);
      this.source.connect(node);
    }
    node.connect(this.output);
  }

  // Takes the gate out of the path and lets its node go.
  private release(): void {
    const node = this.node;
    if (!node) return;
    this.node = null;
    this.reductionDb = 0;
    if (this.source) {
      tryDisconnect(this.source, node);
      this.source.connect(this.output);
    }
    disposeWorkletNode(node);
  }

  private applyParams(glide: boolean): void {
    const node = this.node;
    if (!node) return;
    for (const [name, value] of Object.entries(gateParams(this.state))) {
      const param = node.parameters.get(name);
      if (param) setParam(this.ctx, param, value, glide);
    }
  }
}
