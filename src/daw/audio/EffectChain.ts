// ── EffectChain ─────────────────────────────────────────────────────────────
// The ordered chain of effects between a track's (or a bus's) source and its
// destination. Each slot is a module in graph/effects/ that owns its nodes and
// its bypass wiring; this class only composes them, in one fixed order:
//
//   input → EQ → EQ makeup → Gate → Compressor → Crush →
//   Makeup (+ pre/post meter taps) → Presence → De-esser → Reverb → Delay →
//   Saturator → Multiband → Ducker → output
//
// The EQ and the compressor (with its crush) are always in the path; the
// other slots bypass by rewiring when they're off.

import type { AutomationTarget } from './automation';
import { CompressorModule } from './graph/effects/compressor';
import { DeEsserModule } from './graph/effects/deEsser';
import { DelayModule } from './graph/effects/delay';
import { DuckerModule } from './graph/effects/ducker';
import { EqModule } from './graph/effects/eq';
import { GateModule } from './graph/effects/gate';
import { MultibandModule } from './graph/effects/multiband';
import { PresenceModule } from './graph/effects/presence';
import { ReverbModule } from './graph/effects/reverb';
import { SaturatorModule } from './graph/effects/saturator';
import type { EffectModule, EffectUpdateOptions } from './graph/effects/types';

export { PARAM_GLIDE_S } from './graph/effects/params';

export type ReverbType = 'hall' | 'room' | 'chamber' | 'plate' | 'spring';

export interface ReverbParams {
  enabled: boolean;
  type: ReverbType; // reverb algorithm
  decay: number; // 0.1 – 10 seconds
  preDelay: number; // 0 – 200 ms
  highPass: number; // 20 – 2000 Hz
  lowPass: number; // 1000 – 20000 Hz
  wet: number; // 0 – 1
}

export type EqBandType =
  | 'lowcut'
  | 'lowshelf'
  | 'peaking'
  | 'highshelf'
  | 'highcut';
export type FilterSlope = 12 | 24; // dB/oct

export interface EqBand {
  type: EqBandType;
  freq: number; // 20 – 20000 Hz
  gain: number; // -12 – 12 dB
  Q: number; // 0.1 – 10 (all band types)
  enabled: boolean;
  slope?: FilterSlope; // lowcut/highcut only — 12 or 24 dB/oct (default 12)
}

export interface EqParams {
  enabled: boolean;
  bands: EqBand[];
  makeup: number; // 0 – 12 dB output gain
}

export interface GateParams {
  enabled: boolean;
  threshold: number; // -96 – 0 dB
  range: number; // 0 – 80 dB (attenuation when closed)
  hold: number; // 0 – 0.5 seconds
  attack: number; // 0.001 – 0.5 seconds
  release: number; // 0.01 – 2 seconds
}

export interface CompressorParams {
  enabled: boolean;
  threshold: number; // -60 – 0 dB
  ratio: number; // 1 – 20
  knee: number; // 0 – 40 dB
  attack: number; // 0.001 – 1 seconds
  release: number; // 0.01 – 1 seconds
  makeup: number; // 0 – 24 dB (post-compression gain)
  crush: number; // 0 – 1 (saturation amount)
  auto: boolean; // auto makeup gain
  mode: 'studio' | 'creative';
}

export interface DelayParams {
  enabled: boolean;
  time: number; // 0 – 2 seconds
  feedback: number; // 0 – 0.95
  wet: number; // 0 – 1
}

export interface PresenceParams {
  enabled: boolean;
  amount: number; // 0 – 100
  frequency: number; // 1000 – 12000 Hz
  bandwidth: number; // 0.1 – 4 (Q)
}

export interface DeEsserParams {
  enabled: boolean;
  amount: number; // 0 – 100
  frequency: number; // 2000 – 16000 Hz
  range: number; // 0 – 20 dB (reduction depth)
}

export interface SaturatorParams {
  enabled: boolean;
  drive: number; // 0 – 100
  mix: number; // 0 – 100
  tone: number; // 0 – 100 (low=dark, high=bright)
}

// Sidechain ducker (kick → bass/pad pump). Web Audio has no keyed compressor,
// so this is the dynamics worklet: the KEY track's post-fader tap (resolved by
// id via an injected callback) is its second input, and it ducks this track's
// output gain.
export interface DuckerParams {
  enabled: boolean;
  keyTrackId: string | null; // the sidechain key source (another track's id)
  threshold: number; // -60 – 0 dB (key level above which ducking engages)
  amount: number; // 0 – 1 (max gain reduction; 1 = duck to silence)
  attack: number; // 0.001 – 0.5 s (how fast the duck clamps down)
  release: number; // 0.01 – 1 s (how fast it recovers)
}

// OTT-style 3-band up/down compressor. `depth` is the global dry/wet macro
// (Ableton's OTT "Depth"): 0 = bypass (exact null), 1 = fully processed.
export interface MultibandParams {
  enabled: boolean;
  depth: number; // 0 – 1 (dry/wet of the whole effect)
  time: number; // 0 – 1 (attack/release scale: 0 fast, 1 slow)
  crossoverLow: number; // 40 – 500 Hz (low/mid split)
  crossoverHigh: number; // 800 – 8000 Hz (mid/high split)
  lowGain: number; // -12 – 12 dB per-band trim
  midGain: number; // -12 – 12 dB
  highGain: number; // -12 – 12 dB
}

export type EffectSlotType =
  | 'compressor'
  | 'gate'
  | 'eq'
  | 'reverb'
  | 'delay'
  | 'presence'
  | 'de-esser'
  | 'saturator'
  | 'multiband'
  | 'ducker';

export interface TrackEffectState {
  reverb: ReverbParams;
  eq: EqParams;
  gate: GateParams;
  compressor: CompressorParams;
  delay: DelayParams;
  presence: PresenceParams;
  'de-esser': DeEsserParams;
  saturator: SaturatorParams;
  multiband: MultibandParams;
  ducker: DuckerParams;
}

export const DEFAULT_EFFECTS: TrackEffectState = {
  reverb: {
    enabled: false,
    type: 'hall',
    decay: 2,
    preDelay: 20,
    highPass: 100,
    lowPass: 12000,
    wet: 0.3,
  },
  eq: {
    enabled: false,
    makeup: 0,
    bands: [
      { type: 'lowcut', freq: 30, gain: 0, Q: 0.7, enabled: true, slope: 12 },
      { type: 'lowshelf', freq: 80, gain: 0, Q: 0.7, enabled: true },
      { type: 'peaking', freq: 250, gain: 0, Q: 1.0, enabled: true },
      { type: 'peaking', freq: 500, gain: 0, Q: 1.0, enabled: true },
      { type: 'peaking', freq: 1000, gain: 0, Q: 1.0, enabled: true },
      { type: 'peaking', freq: 3000, gain: 0, Q: 1.0, enabled: true },
      { type: 'highshelf', freq: 8000, gain: 0, Q: 0.7, enabled: true },
      {
        type: 'highcut',
        freq: 16000,
        gain: 0,
        Q: 0.7,
        enabled: true,
        slope: 12,
      },
    ],
  },
  gate: {
    enabled: false,
    threshold: -40,
    range: 40,
    hold: 0.01,
    attack: 0.001,
    release: 0.1,
  },
  compressor: {
    enabled: false,
    threshold: -24,
    ratio: 4,
    knee: 10,
    attack: 0.003,
    release: 0.25,
    makeup: 0,
    crush: 0,
    auto: false,
    mode: 'studio',
  },
  delay: { enabled: false, time: 0.375, feedback: 0.3, wet: 0.25 },
  presence: { enabled: false, amount: 50, frequency: 4000, bandwidth: 1.0 },
  'de-esser': { enabled: false, amount: 0, frequency: 6000, range: 6 },
  saturator: { enabled: false, drive: 0, mix: 50, tone: 50 },
  multiband: {
    enabled: false,
    // Starts as subtle glue; the OTT lesson teaches pushing Depth up to taste.
    depth: 0.3,
    time: 0.3,
    crossoverLow: 120,
    crossoverHigh: 2500,
    lowGain: 0,
    midGain: 0,
    highGain: 0,
  },
  ducker: {
    enabled: false,
    keyTrackId: null,
    threshold: -30,
    // Starts as a subtle duck; the "Make it pump" lesson teaches raising it.
    amount: 0.3,
    attack: 0.01,
    release: 0.2,
  },
};

// ── EffectChain class ─────────────────────────────────────────────────────

export class EffectChain {
  private inputNode: GainNode;
  private outputNode: GainNode;

  private readonly eq: EqModule;
  private readonly gate: GateModule;
  private readonly compressor: CompressorModule;
  private readonly presence: PresenceModule;
  private readonly deEsser: DeEsserModule;
  private readonly reverb: ReverbModule;
  private readonly delay: DelayModule;
  private readonly saturator: SaturatorModule;
  private readonly multiband: MultibandModule;
  private readonly ducker: DuckerModule;
  /** The modules in signal order. */
  private readonly modules: EffectModule<unknown>[];
  /** Each slot's module, for its automation targets. */
  private readonly bySlot: Record<EffectSlotType, EffectModule<unknown>>;

  // Whether update() has run: until then the modules hold the constructor's
  // defaults, not something anyone has heard.
  private hasUpdated = false;

  constructor(ctx: AudioContext) {
    const initial = structuredClone(DEFAULT_EFFECTS);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Built in the order the nodes have always been made in.
    this.reverb = new ReverbModule(ctx, initial.reverb);
    this.eq = new EqModule(ctx, initial.eq);
    this.gate = new GateModule(ctx, initial.gate);
    this.compressor = new CompressorModule(ctx, initial.compressor);
    this.delay = new DelayModule(ctx);
    this.presence = new PresenceModule(ctx);
    this.deEsser = new DeEsserModule(ctx);
    this.saturator = new SaturatorModule(ctx);
    this.multiband = new MultibandModule(ctx, initial.multiband);
    this.ducker = new DuckerModule(ctx, initial.ducker);

    this.modules = [
      this.eq,
      this.gate,
      this.compressor,
      this.presence,
      this.deEsser,
      this.reverb,
      this.delay,
      this.saturator,
      this.multiband,
      this.ducker,
    ] as EffectModule<unknown>[];
    this.bySlot = {
      eq: this.eq,
      gate: this.gate,
      compressor: this.compressor,
      presence: this.presence,
      'de-esser': this.deEsser,
      reverb: this.reverb,
      delay: this.delay,
      saturator: this.saturator,
      multiband: this.multiband,
      ducker: this.ducker,
    } as Record<EffectSlotType, EffectModule<unknown>>;

    this.buildChain();
  }

  /** Inject the callback that resolves a key track's post-fader tap by id
   *  (from the playback engine's track registry); the tap is connected to the
   *  ducker's key input. */
  setKeySourceResolver(fn: (trackId: string) => AnalyserNode | null): void {
    this.ducker.setKeySourceResolver(fn);
  }

  /** Re-resolves the ducker's key tap (the track engines were made again). */
  refreshDuckerKey(): void {
    this.ducker.refreshKey();
  }

  /**
   * Resolves once a gate or ducker that is on is in the path: their worklet
   * module loads when they are first switched on. An offline render awaits
   * this after its last update, before it starts.
   */
  whenDynamicsReady(): Promise<void> {
    return Promise.all([this.gate.whenReady(), this.ducker.whenReady()]).then(
      () => undefined,
    );
  }

  /** Current sidechain gain reduction in dB (≤ 0) for the GR meter. */
  getDuckReduction(): number {
    return this.ducker.getReduction();
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  /**
   * Resolve an `effect.<slot>.<param>` automation lane to its ramp target(s).
   * Only continuous, offline-renderable AudioParams are exposed — the value maps
   * mirror `update()` exactly (wet/dry pairs, presence dB, saturator mix). Gate,
   * ducker (worklet parameters, made only once switched on), curve regens and IR swaps are
   * deliberately NOT rideable; unsupported combos return []. Keep in sync with
   * AUTOMATION_PARAMS in automationParams.ts.
   */
  getAutomationTargets(
    slot: EffectSlotType,
    param: string,
  ): AutomationTarget[] {
    return this.bySlot[slot]?.automationTargets(param) ?? [];
  }

  // ── Public metering access ──────────────────────────────────────────────

  getPreCompAnalyser(): AnalyserNode {
    return this.compressor.preCompAnalyser;
  }

  getPostCompAnalyser(): AnalyserNode {
    return this.compressor.postCompAnalyser;
  }

  getGainReduction(): number {
    return this.compressor.getGainReduction(); // negative dB value
  }

  // ── Test seams: the nodes the chain's tests inspect ─────────────────────

  /** @internal */
  get reverbWetGain(): GainNode {
    return this.reverb.wetGain;
  }

  /** @internal */
  get reverbConvolver(): ConvolverNode {
    return this.reverb.convolver;
  }

  /** @internal */
  get crushNode(): WaveShaperNode {
    return this.compressor.crushNode;
  }

  /** @internal */
  get eqFilterGroups(): BiquadFilterNode[][] {
    return this.eq.filterGroups;
  }

  // ── Build the full signal chain ──────────────────────────────────────
  // Neighbouring modules meet at a boundary node that one of them owns: the
  // earlier one's output, or else the later one's input. The first module
  // starts at the chain's input and the last ends at its output.

  private buildChain(): void {
    // Disconnect everything first
    this.inputNode.disconnect();
    for (const module of this.modules) module.unwire();

    let source: AudioNode = this.inputNode;
    this.modules.forEach((module, i) => {
      const next = this.modules[i + 1];
      const destination =
        module.output ?? next?.input ?? (this.outputNode as AudioNode);
      module.wire(source, destination);
      source = destination;
    });
  }

  // ── Update parameters ─────────────────────────────────────────────────

  /**
   * Brings the chain to `newState`. A preview while a control moves
   * (useContinuousControl) passes `glide`, so parameters move over a few
   * milliseconds instead of stepping at the pointer's rate, and `deferIr`, so
   * the reverb's impulse response is rebuilt once on release rather than for
   * every Decay step: the chain keeps its old IR, and remembers the old decay
   * and type, so the release's update builds the new one.
   */
  update(
    newState: TrackEffectState,
    opts: { glide?: boolean; deferIr?: boolean } = {},
  ): void {
    // A new chain's first update is not heard yet, and a bounce must start
    // exact: it never glides.
    const moduleOpts: EffectUpdateOptions = {
      glide: (opts.glide ?? false) && this.hasUpdated,
      heard: this.hasUpdated,
      deferIr: opts.deferIr ?? false,
    };
    // The order the slots have always been updated in.
    this.reverb.update(newState.reverb, moduleOpts);
    this.eq.update(newState.eq, moduleOpts);
    this.gate.update(newState.gate, moduleOpts);
    this.compressor.update(newState.compressor, moduleOpts);
    this.presence.update(newState.presence, moduleOpts);
    this.deEsser.update(newState['de-esser'], moduleOpts);
    this.delay.update(newState.delay, moduleOpts);
    this.saturator.update(newState.saturator, moduleOpts);
    this.multiband.update(newState.multiband, moduleOpts);
    this.ducker.update(newState.ducker, moduleOpts);
    this.hasUpdated = true;
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    for (const module of this.modules) module.dispose();
  }
}
