/**
 * Shared effect chain builder for real-time and offline audio contexts.
 * Works with both AudioContext and OfflineAudioContext.
 */

export type EffectType = 'reverb' | 'delay' | 'phaser' | 'flanger' | 'eq' | 'compressor' | 'limiter' | 'sidechain';

export interface EffectParams {
  wet: number;           // 0.0 - 1.0
  decay?: number;        // reverb decay in seconds (0.5 - 10)
  time?: number;         // delay time in seconds (0.05 - 2.0)
  feedback?: number;     // delay/flanger feedback (0.0 - 0.95)
  rate?: number;         // LFO rate in Hz for phaser/flanger (0.1 - 8.0)
  depth?: number;        // modulation depth (0.0 - 1.0)
  stages?: number;       // phaser allpass stages (2, 4, 6, 8)
  flangerDelay?: number; // base flanger delay in ms (1 - 10)
  // EQ params
  eqType?: BiquadFilterType;  // highpass, lowpass, peaking, highshelf, lowshelf
  eqFrequency?: number;       // center/cutoff frequency in Hz
  eqGain?: number;             // gain in dB (peaking/shelf)
  eqQ?: number;                // Q factor
  // Compressor/limiter params
  threshold?: number;          // dB
  knee?: number;               // dB
  ratio?: number;
  attack?: number;             // seconds
  release?: number;            // seconds
  // Sidechain params
  sidechainSourceTrackId?: string;  // track whose signal drives the ducking
  sidechainAmount?: number;          // 0-1, max gain reduction depth
}

export interface TrackEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
}

export interface EffectChainResult {
  inputNode: AudioNode;
  outputNode: AudioNode;
  effectNodes: AudioNode[];
  /** Maps sidechain effect IDs to their controllable GainNodes */
  sidechainGains?: Map<string, { gain: GainNode; params: EffectParams }>;
}

export const DEFAULT_EFFECT_PARAMS: Record<EffectType, EffectParams> = {
  reverb:     { wet: 0.3, decay: 3.0 },
  delay:      { wet: 0.25, time: 0.5, feedback: 0.4 },
  phaser:     { wet: 0.5, rate: 0.5, depth: 0.5, stages: 4 },
  flanger:    { wet: 0.5, rate: 0.3, depth: 0.5, feedback: 0.5, flangerDelay: 5 },
  eq:         { wet: 1.0, eqType: 'peaking', eqFrequency: 1000, eqGain: 0, eqQ: 1 },
  compressor: { wet: 1.0, threshold: -24, knee: 30, ratio: 4, attack: 0.003, release: 0.25 },
  limiter:    { wet: 1.0, threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.01 },
  sidechain:  { wet: 1.0, threshold: -30, attack: 0.01, release: 0.15, sidechainAmount: 0.8, sidechainSourceTrackId: '' },
};

function createReverb(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const convolver = ctx.createConvolver();
  const output = ctx.createGain();
  output.gain.value = 1.0;

  const decay = params.decay ?? 3.0;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * decay);
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }

  convolver.buffer = impulse;
  input.connect(convolver);
  convolver.connect(output);

  return { input, output, nodes: [input, convolver, output] };
}

function createDelay(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay(5.0);
  const feedback = ctx.createGain();

  delay.delayTime.value = params.time ?? 0.5;
  feedback.gain.value = Math.min(params.feedback ?? 0.4, 0.95);

  input.connect(delay);
  delay.connect(output);
  delay.connect(feedback);
  feedback.connect(delay);

  return { input, output, nodes: [input, delay, feedback, output] };
}

function createPhaser(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const stages = params.stages ?? 4;
  const allNodes: AudioNode[] = [input, output];

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = params.rate ?? 0.5;
  lfoGain.gain.value = (params.depth ?? 0.5) * 1000;
  lfo.connect(lfoGain);
  lfo.start();
  allNodes.push(lfo, lfoGain);

  let current: AudioNode = input;
  for (let i = 0; i < stages; i++) {
    const allpass = ctx.createBiquadFilter();
    allpass.type = 'allpass';
    allpass.frequency.value = 1000;
    lfoGain.connect(allpass.frequency);
    current.connect(allpass);
    current = allpass;
    allNodes.push(allpass);
  }
  current.connect(output);

  return { input, output, nodes: allNodes };
}

function createFlanger(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay(0.02);
  const feedback = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  const baseDelay = (params.flangerDelay ?? 5) / 1000;
  delay.delayTime.value = baseDelay;
  feedback.gain.value = Math.min(params.feedback ?? 0.5, 0.95);
  lfo.type = 'sine';
  lfo.frequency.value = params.rate ?? 0.3;
  lfoGain.gain.value = (params.depth ?? 0.5) * baseDelay;

  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  input.connect(output);   // dry path
  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(output);

  return { input, output, nodes: [input, delay, feedback, lfo, lfoGain, output] };
}

function createEQ(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = (params.eqType as BiquadFilterType) || 'peaking';
  filter.frequency.value = params.eqFrequency ?? 1000;
  filter.Q.value = params.eqQ ?? 1;
  if (filter.type === 'peaking' || filter.type === 'lowshelf' || filter.type === 'highshelf') {
    filter.gain.value = params.eqGain ?? 0;
  }
  input.connect(filter);
  filter.connect(output);
  return { input, output, nodes: [input, filter, output] };
}

function createCompressor(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = params.threshold ?? -24;
  comp.knee.value = params.knee ?? 30;
  comp.ratio.value = params.ratio ?? 4;
  comp.attack.value = params.attack ?? 0.003;
  comp.release.value = params.release ?? 0.25;
  input.connect(comp);
  comp.connect(output);
  return { input, output, nodes: [input, comp, output] };
}

function createLimiter(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = params.threshold ?? -1;
  comp.knee.value = params.knee ?? 0;
  comp.ratio.value = params.ratio ?? 20;
  comp.attack.value = params.attack ?? 0.001;
  comp.release.value = params.release ?? 0.01;
  input.connect(comp);
  comp.connect(output);
  return { input, output, nodes: [input, comp, output] };
}

function createSidechain(ctx: BaseAudioContext, params: EffectParams): { input: AudioNode; output: AudioNode; nodes: AudioNode[]; duckGain: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const duckGain = ctx.createGain();
  duckGain.gain.value = 1.0;
  input.connect(duckGain);
  duckGain.connect(output);
  return { input, output, nodes: [input, duckGain, output], duckGain };
}

const EFFECT_FACTORIES: Record<EffectType, (ctx: BaseAudioContext, params: EffectParams) => { input: AudioNode; output: AudioNode; nodes: AudioNode[]; duckGain?: GainNode }> = {
  reverb: createReverb,
  delay: createDelay,
  phaser: createPhaser,
  flanger: createFlanger,
  eq: createEQ,
  compressor: createCompressor,
  limiter: createLimiter,
  sidechain: createSidechain,
};

/**
 * Build a complete effects chain from a list of TrackEffect definitions.
 * Returns input/output nodes that can be inserted into the signal path.
 * Works with both AudioContext (real-time) and OfflineAudioContext (export).
 */
export function buildEffectChain(ctx: BaseAudioContext, effects: TrackEffect[]): EffectChainResult {
  const enabledEffects = effects.filter(e => e.enabled);

  if (enabledEffects.length === 0) {
    const passthrough = ctx.createGain();
    passthrough.gain.value = 1.0;
    return { inputNode: passthrough, outputNode: passthrough, effectNodes: [] };
  }

  const allNodes: AudioNode[] = [];
  const sidechainGains = new Map<string, { gain: GainNode; params: EffectParams }>();
  const inputGain = ctx.createGain();
  inputGain.gain.value = 1.0;
  allNodes.push(inputGain);

  let currentNode: AudioNode = inputGain;

  for (const effect of enabledEffects) {
    const factory = EFFECT_FACTORIES[effect.type];
    if (!factory) continue;

    const result = factory(ctx, effect.params);
    allNodes.push(...result.nodes);

    // Collect sidechain gain nodes for external modulation
    if (effect.type === 'sidechain' && result.duckGain) {
      sidechainGains.set(effect.id, { gain: result.duckGain, params: effect.params });
    }

    // Dry/wet mixing
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const mixer = ctx.createGain();
    dryGain.gain.value = 1.0 - effect.params.wet;
    wetGain.gain.value = effect.params.wet;
    mixer.gain.value = 1.0;

    currentNode.connect(dryGain);
    currentNode.connect(result.input);
    result.output.connect(wetGain);
    dryGain.connect(mixer);
    wetGain.connect(mixer);

    allNodes.push(dryGain, wetGain, mixer);
    currentNode = mixer;
  }

  return {
    inputNode: inputGain,
    outputNode: currentNode,
    effectNodes: allNodes,
    sidechainGains: sidechainGains.size > 0 ? sidechainGains : undefined,
  };
}
