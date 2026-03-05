// ── EffectChain ─────────────────────────────────────────────────────────────
// Manages an ordered chain of Web Audio effects between a source and
// destination node. Effects: Gate, EQ (8-band parametric), Compressor
// (with crush & makeup), Reverb (convolver), Delay (feedback).
//
// Signal chain:
//   input → EQ → Gate → Compressor → Crush → Makeup → Reverb → Delay → output

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

export type EffectSlotType =
  | 'compressor'
  | 'gate'
  | 'eq'
  | 'reverb'
  | 'delay'
  | 'presence'
  | 'de-esser'
  | 'saturator';

export interface TrackEffectState {
  reverb: ReverbParams;
  eq: EqParams;
  gate: GateParams;
  compressor: CompressorParams;
  delay: DelayParams;
  presence: PresenceParams;
  'de-esser': DeEsserParams;
  saturator: SaturatorParams;
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
};

// ── Map EqBandType to Web Audio BiquadFilterType ──────────────────────────

function eqBandTypeToBiquad(type: EqBandType): BiquadFilterType {
  switch (type) {
    case 'lowcut':
      return 'highpass';
    case 'lowshelf':
      return 'lowshelf';
    case 'peaking':
      return 'peaking';
    case 'highshelf':
      return 'highshelf';
    case 'highcut':
      return 'lowpass';
  }
}

// ── Generate impulse response for reverb (cached by type + decay) ─────────

const irCache = new Map<string, AudioBuffer>();

function generateImpulseResponse(
  ctx: AudioContext,
  decay: number,
  type: ReverbType = 'hall',
): AudioBuffer {
  const quantizedDecay = Math.round(decay * 10) / 10;
  const key = `${ctx.sampleRate}:${type}:${quantizedDecay}`;

  let buffer = irCache.get(key);
  if (buffer) return buffer;

  const sampleRate = ctx.sampleRate;
  const length = Math.round(sampleRate * Math.max(0.1, quantizedDecay));
  buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;

      switch (type) {
        case 'hall': {
          // Long, smooth decay with gradual onset and wide stereo
          const onset = Math.min(1, t / 0.03); // 30ms build-up
          const stereoSpread = ch === 0 ? 1 : 0.85 + Math.random() * 0.15;
          data[i] =
            noise *
            onset *
            Math.exp((-2.5 * t) / quantizedDecay) *
            stereoSpread;
          break;
        }
        case 'room': {
          // Short early reflections, tighter stereo, faster decay
          const earlyRef = t < 0.015 ? 0.6 + Math.random() * 0.4 : 1;
          data[i] = noise * earlyRef * Math.exp((-4 * t) / quantizedDecay);
          break;
        }
        case 'chamber': {
          // Dense early reflections, warm mid-range
          const density = 1 + 0.3 * Math.sin(t * 200);
          data[i] = noise * density * Math.exp((-3 * t) / quantizedDecay);
          break;
        }
        case 'plate': {
          // Very dense, bright, instant onset — high-density noise
          const brightness = 1 + 0.15 * Math.sin(t * 800);
          data[i] = noise * brightness * Math.exp((-3.5 * t) / quantizedDecay);
          break;
        }
        case 'spring': {
          // Metallic, bouncy — comb filter resonance
          const combDelay = Math.round(sampleRate * 0.0037); // ~3.7ms comb
          const combSample = i > combDelay ? data[i - combDelay] * 0.4 : 0;
          data[i] =
            (noise + combSample) * Math.exp((-4.5 * t) / quantizedDecay);
          break;
        }
      }
    }
  }

  irCache.set(key, buffer);
  return buffer;
}

// ── Generate crush (saturation) curve ─────────────────────────────────────

const crushCurveCache = new Map<number, Float32Array>();

function generateCrushCurve(crush: number): Float32Array {
  const quantized = Math.round(crush * 100);
  let curve = crushCurveCache.get(quantized);
  if (curve) return curve;

  const samples = 4096;
  curve = new Float32Array(samples);
  const drive = 1 + crush * 20;
  const norm = Math.tanh(drive);

  for (let i = 0; i < samples; i++) {
    const x = (2 * i) / (samples - 1) - 1; // -1 to 1
    curve[i] = Math.tanh(drive * x) / norm;
  }

  crushCurveCache.set(quantized, curve);
  return curve;
}

// ── EffectChain class ─────────────────────────────────────────────────────

export class EffectChain {
  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;

  // Reverb
  private reverbConvolver: ConvolverNode;
  private reverbPreDelay: DelayNode;
  private reverbHighPass: BiquadFilterNode;
  private reverbLowPass: BiquadFilterNode;
  private reverbWetGain: GainNode;
  private reverbDryGain: GainNode;
  private reverbMerge: GainNode;

  // EQ (8-band parametric — each band is 1–2 nodes for 12/24 dB slope)
  private eqFilterGroups: BiquadFilterNode[][];
  private eqMakeupGain: GainNode;

  // Gate
  private gateAnalyser: AnalyserNode;
  private gateGain: GainNode;
  private gateOpen = true;
  private gateHoldRemaining = 0;
  private gateIntervalId: number | null = null;

  // Compressor
  private compressor: DynamicsCompressorNode;

  // Crush (saturation waveshaper)
  private crushNode: WaveShaperNode;

  // Makeup gain
  private makeupGain: GainNode;

  // Metering
  private preCompAnalyser: AnalyserNode;
  private postCompAnalyser: AnalyserNode;

  // Delay
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWetGain: GainNode;
  private delayDryGain: GainNode;
  private delayMerge: GainNode;

  // Presence (peaking EQ boost)
  private presenceFilter: BiquadFilterNode;

  // De-Esser (dynamic sibilance reduction via sidechain)
  private deEsserFilter: BiquadFilterNode;
  private deEsserCompressor: DynamicsCompressorNode;
  private deEsserDryGain: GainNode;
  private deEsserWetGain: GainNode;
  private deEsserMerge: GainNode;

  // Saturator (waveshaper with dry/wet mix and tone)
  private saturatorShaper: WaveShaperNode;
  private saturatorToneFilter: BiquadFilterNode;
  private saturatorDryGain: GainNode;
  private saturatorWetGain: GainNode;
  private saturatorMerge: GainNode;

  // Bypass tracking
  private reverbBypassed = true;
  private delayBypassed = true;
  private presenceBypassed = true;
  private deEsserBypassed = true;
  private saturatorBypassed = true;

  private state: TrackEffectState;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.state = structuredClone(DEFAULT_EFFECTS);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // ── Reverb ────────────────────────────────────────────────────────
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = generateImpulseResponse(
      ctx,
      this.state.reverb.decay,
      this.state.reverb.type,
    );
    this.reverbPreDelay = ctx.createDelay(0.2);
    this.reverbPreDelay.delayTime.value = this.state.reverb.preDelay / 1000;
    this.reverbHighPass = ctx.createBiquadFilter();
    this.reverbHighPass.type = 'highpass';
    this.reverbHighPass.frequency.value = this.state.reverb.highPass;
    this.reverbHighPass.Q.value = 0.7;
    this.reverbLowPass = ctx.createBiquadFilter();
    this.reverbLowPass.type = 'lowpass';
    this.reverbLowPass.frequency.value = this.state.reverb.lowPass;
    this.reverbLowPass.Q.value = 0.7;
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = 0;
    this.reverbDryGain = ctx.createGain();
    this.reverbDryGain.gain.value = 1;
    this.reverbMerge = ctx.createGain();

    // ── EQ (8-band parametric, 1–2 nodes per band for slope) ──────────
    this.eqFilterGroups = this.state.eq.bands.map((band) =>
      this.createFilterGroup(band),
    );

    // ── EQ makeup gain ────────────────────────────────────────────────
    this.eqMakeupGain = ctx.createGain();

    // ── Gate ──────────────────────────────────────────────────────────
    this.gateAnalyser = ctx.createAnalyser();
    this.gateAnalyser.fftSize = 256;
    this.gateAnalyser.smoothingTimeConstant = 0;
    this.gateGain = ctx.createGain();
    this.gateGain.gain.value = 1;

    // ── Compressor ────────────────────────────────────────────────────
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = this.state.compressor.threshold;
    this.compressor.ratio.value = this.state.compressor.ratio;
    this.compressor.knee.value = this.state.compressor.knee;
    this.compressor.attack.value = this.state.compressor.attack;
    this.compressor.release.value = this.state.compressor.release;

    // ── Crush (saturation) ────────────────────────────────────────────
    this.crushNode = ctx.createWaveShaper();
    this.crushNode.oversample = '2x';
    // Default: linear (no crush)
    this.crushNode.curve = generateCrushCurve(0) as Float32Array<ArrayBuffer>;

    // ── Makeup gain ──────────────────────────────────────────────────
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 1;

    // ── Metering analysers ──────────────────────────────────────────
    this.preCompAnalyser = ctx.createAnalyser();
    this.preCompAnalyser.fftSize = 256;
    this.preCompAnalyser.smoothingTimeConstant = 0;
    this.postCompAnalyser = ctx.createAnalyser();
    this.postCompAnalyser.fftSize = 256;
    this.postCompAnalyser.smoothingTimeConstant = 0;

    // ── Delay ─────────────────────────────────────────────────────────
    this.delayNode = ctx.createDelay(5);
    this.delayNode.delayTime.value = 0.375;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0;
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.value = 0;
    this.delayDryGain = ctx.createGain();
    this.delayDryGain.gain.value = 1;
    this.delayMerge = ctx.createGain();

    // ── Presence (peaking EQ boost around a frequency) ────────────────
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 4000;
    this.presenceFilter.Q.value = 1.0;
    this.presenceFilter.gain.value = 0;

    // ── De-Esser (sidechain compressor on high frequencies) ───────────
    this.deEsserFilter = ctx.createBiquadFilter();
    this.deEsserFilter.type = 'bandpass';
    this.deEsserFilter.frequency.value = 6000;
    this.deEsserFilter.Q.value = 2.0;
    this.deEsserCompressor = ctx.createDynamicsCompressor();
    this.deEsserCompressor.threshold.value = 0;
    this.deEsserCompressor.ratio.value = 1;
    this.deEsserCompressor.knee.value = 0;
    this.deEsserCompressor.attack.value = 0.001;
    this.deEsserCompressor.release.value = 0.05;
    this.deEsserDryGain = ctx.createGain();
    this.deEsserDryGain.gain.value = 1;
    this.deEsserWetGain = ctx.createGain();
    this.deEsserWetGain.gain.value = 0;
    this.deEsserMerge = ctx.createGain();

    // ── Saturator (waveshaper with dry/wet mix and tone) ──────────────
    this.saturatorShaper = ctx.createWaveShaper();
    this.saturatorShaper.oversample = '2x';
    this.saturatorShaper.curve = generateCrushCurve(
      0,
    ) as Float32Array<ArrayBuffer>;
    this.saturatorToneFilter = ctx.createBiquadFilter();
    this.saturatorToneFilter.type = 'lowpass';
    this.saturatorToneFilter.frequency.value = 10000;
    this.saturatorToneFilter.Q.value = 0.7;
    this.saturatorDryGain = ctx.createGain();
    this.saturatorDryGain.gain.value = 1;
    this.saturatorWetGain = ctx.createGain();
    this.saturatorWetGain.gain.value = 0;
    this.saturatorMerge = ctx.createGain();

    this.buildChain();
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  // ── Public metering access ──────────────────────────────────────────────

  getPreCompAnalyser(): AnalyserNode {
    return this.preCompAnalyser;
  }

  getPostCompAnalyser(): AnalyserNode {
    return this.postCompAnalyser;
  }

  getGainReduction(): number {
    return this.compressor.reduction; // negative dB value
  }

  // ── Gate polling loop ──────────────────────────────────────────────────

  startGateLoop(): void {
    if (this.gateIntervalId !== null) return;
    const buffer = new Float32Array(this.gateAnalyser.fftSize);
    const POLL_MS = 16; // ~60Hz

    this.gateIntervalId = window.setInterval(() => {
      if (!this.state.gate.enabled) {
        if (this.gateGain.gain.value !== 1) {
          this.gateGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
        }
        return;
      }

      this.gateAnalyser.getFloatTimeDomainData(buffer);

      // Peak detection
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peak) peak = abs;
      }
      const peakDb = 20 * Math.log10(peak + 1e-10);

      const { threshold, range, hold, attack, release } = this.state.gate;
      const closedGain = Math.pow(10, -range / 20);
      const now = this.ctx.currentTime;

      if (peakDb >= threshold) {
        // Signal above threshold — open gate
        if (!this.gateOpen) {
          this.gateGain.gain.cancelScheduledValues(now);
          this.gateGain.gain.setTargetAtTime(
            1,
            now,
            Math.max(0.001, attack / 3),
          );
          this.gateOpen = true;
        }
        this.gateHoldRemaining = hold;
      } else if (this.gateHoldRemaining > 0) {
        // In hold period
        this.gateHoldRemaining -= POLL_MS / 1000;
      } else {
        // Below threshold, hold expired — close gate
        if (this.gateOpen) {
          this.gateGain.gain.cancelScheduledValues(now);
          this.gateGain.gain.setTargetAtTime(
            closedGain,
            now,
            Math.max(0.005, release / 3),
          );
          this.gateOpen = false;
        }
      }
    }, POLL_MS);
  }

  stopGateLoop(): void {
    if (this.gateIntervalId !== null) {
      clearInterval(this.gateIntervalId);
      this.gateIntervalId = null;
    }
  }

  // ── Create filter group for a band (1 node for 12dB, 2 for 24dB) ───

  private createFilterGroup(band: EqBand): BiquadFilterNode[] {
    const isCut = band.type === 'lowcut' || band.type === 'highcut';
    const count = isCut && band.slope === 24 ? 2 : 1;
    return Array.from({ length: count }, () => {
      const f = this.ctx.createBiquadFilter();
      f.type = eqBandTypeToBiquad(band.type);
      f.frequency.value = band.freq;
      f.Q.value = band.Q;
      f.gain.value = band.gain;
      return f;
    });
  }

  // ── Build the full signal chain ──────────────────────────────────────
  // input → EQ → Gate → Compressor → Crush → Makeup → Presence → DeEsser → Saturator → Reverb → Delay → output

  private buildChain(): void {
    // Disconnect everything first
    this.inputNode.disconnect();
    this.reverbMerge.disconnect();
    this.eqFilterGroups.forEach((group) =>
      group.forEach((f) => f.disconnect()),
    );
    this.eqMakeupGain.disconnect();
    this.gateAnalyser.disconnect();
    this.gateGain.disconnect();
    this.compressor.disconnect();
    this.crushNode.disconnect();
    this.makeupGain.disconnect();
    this.preCompAnalyser.disconnect();
    this.postCompAnalyser.disconnect();
    this.presenceFilter.disconnect();
    this.deEsserMerge.disconnect();
    this.saturatorMerge.disconnect();
    this.delayMerge.disconnect();

    // Flatten all filter groups into a single ordered list
    const allFilters = this.eqFilterGroups.flat();

    // EQ chain: input → filter[0] → filter[1] → ... → filter[N]
    this.inputNode.connect(allFilters[0]);
    for (let i = 0; i < allFilters.length - 1; i++) {
      allFilters[i].connect(allFilters[i + 1]);
    }

    // Last EQ filter → EQ makeup gain → Gate analyser (parallel tap) + Gate gain
    const lastEq = allFilters[allFilters.length - 1];
    lastEq.connect(this.eqMakeupGain);
    this.eqMakeupGain.connect(this.gateAnalyser); // parallel tap for level detection
    this.eqMakeupGain.connect(this.gateGain);

    // Gate → preComp analyser (parallel tap) + Compressor
    this.gateGain.connect(this.preCompAnalyser); // parallel tap
    this.gateGain.connect(this.compressor);

    // Compressor → Crush → Makeup
    this.compressor.connect(this.crushNode);
    this.crushNode.connect(this.makeupGain);

    // Makeup → postComp analyser (parallel tap)
    this.makeupGain.connect(this.postCompAnalyser); // parallel tap

    // Presence (true bypass)
    this.wirePresenceBypass(this.presenceBypassed);

    // De-Esser (true bypass)
    this.wireDeEsserBypass(this.deEsserBypassed);

    // Reverb section wiring (depends on bypass state)
    this.wireReverbBypass(this.reverbBypassed);

    // Delay section wiring (depends on bypass state)
    this.wireDelayBypass(this.delayBypassed);

    // Saturator (true bypass) — last in chain before output
    this.wireSaturatorBypass(this.saturatorBypassed);
  }

  // ── True bypass: Presence ─────────────────────────────────────────────
  // Chain: makeupGain → [presenceFilter] → deEsser input

  private wirePresenceBypass(bypassed: boolean): void {
    try {
      this.makeupGain.disconnect(this.presenceFilter);
    } catch {
      /* ok */
    }
    try {
      this.presenceFilter.disconnect(this.deEsserMerge);
    } catch {
      /* ok */
    }
    try {
      this.makeupGain.disconnect(this.deEsserMerge);
    } catch {
      /* ok */
    }

    if (bypassed) {
      this.makeupGain.connect(this.deEsserMerge);
    } else {
      this.makeupGain.connect(this.presenceFilter);
      this.presenceFilter.connect(this.deEsserMerge);
    }
    this.presenceBypassed = bypassed;
  }

  // ── True bypass: De-Esser ───────────────────────────────────────────────
  // Chain: deEsserMerge → [de-esser sidechain compressor] → reverb input
  // Sidechain: deEsserMerge → bandpass → compressor (sidechain triggers on HF)

  private wireDeEsserBypass(bypassed: boolean): void {
    try {
      this.deEsserMerge.disconnect(this.deEsserDryGain);
    } catch {
      /* ok */
    }
    try {
      this.deEsserMerge.disconnect(this.deEsserFilter);
    } catch {
      /* ok */
    }
    try {
      this.deEsserMerge.disconnect(this.deEsserCompressor);
    } catch {
      /* ok */
    }
    try {
      this.deEsserMerge.disconnect(this.reverbMerge);
    } catch {
      /* ok */
    }
    try {
      this.deEsserFilter.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.deEsserCompressor.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.deEsserDryGain.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.deEsserWetGain.disconnect();
    } catch {
      /* ok */
    }

    if (bypassed) {
      // Pass-through: skip de-esser entirely
      this.deEsserMerge.connect(this.reverbMerge);
    } else {
      // Full signal → compressor for gain reduction
      this.deEsserMerge.connect(this.deEsserCompressor);
      this.deEsserCompressor.connect(this.deEsserWetGain);
      this.deEsserWetGain.connect(this.reverbMerge);
      // Dry path
      this.deEsserMerge.connect(this.deEsserDryGain);
      this.deEsserDryGain.connect(this.reverbMerge);
    }
    this.deEsserBypassed = bypassed;
  }

  // ── True bypass: Reverb ────────────────────────────────────────────────
  // Chain: reverbMerge → [convolver wet/dry] → delayMerge input

  private wireReverbBypass(bypassed: boolean): void {
    try {
      this.reverbMerge.disconnect(this.reverbDryGain);
    } catch {
      /* ok */
    }
    try {
      this.reverbMerge.disconnect(this.reverbPreDelay);
    } catch {
      /* ok */
    }
    try {
      this.reverbMerge.disconnect(this.delayMerge);
    } catch {
      /* ok */
    }
    try {
      this.reverbPreDelay.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.reverbHighPass.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.reverbConvolver.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.reverbLowPass.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.reverbWetGain.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.reverbDryGain.disconnect();
    } catch {
      /* ok */
    }

    if (bypassed) {
      this.reverbMerge.connect(this.delayMerge);
    } else {
      // Dry path
      this.reverbMerge.connect(this.reverbDryGain);
      this.reverbDryGain.connect(this.delayMerge);
      // Wet path: pre-delay → HP → convolver → LP → wet gain
      this.reverbMerge.connect(this.reverbPreDelay);
      this.reverbPreDelay.connect(this.reverbHighPass);
      this.reverbHighPass.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbLowPass);
      this.reverbLowPass.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.delayMerge);
    }
    this.reverbBypassed = bypassed;
  }

  // ── True bypass: Delay ─────────────────────────────────────────────────

  private wireDelayBypass(bypassed: boolean): void {
    try {
      this.delayMerge.disconnect(this.delayDryGain);
    } catch {
      /* ok */
    }
    try {
      this.delayMerge.disconnect(this.delayNode);
    } catch {
      /* ok */
    }
    try {
      this.delayMerge.disconnect(this.saturatorMerge);
    } catch {
      /* ok */
    }
    try {
      this.delayNode.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.delayWetGain.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.delayDryGain.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.delayFeedback.disconnect();
    } catch {
      /* ok */
    }

    if (bypassed) {
      this.delayMerge.connect(this.saturatorMerge);
    } else {
      this.delayMerge.connect(this.delayDryGain);
      this.delayDryGain.connect(this.saturatorMerge);
      this.delayMerge.connect(this.delayNode);
      this.delayNode.connect(this.delayWetGain);
      this.delayWetGain.connect(this.saturatorMerge);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
    }
    this.delayBypassed = bypassed;
  }

  // ── True bypass: Saturator ──────────────────────────────────────────────

  private wireSaturatorBypass(bypassed: boolean): void {
    try {
      this.saturatorMerge.disconnect(this.saturatorShaper);
    } catch {
      /* ok */
    }
    try {
      this.saturatorMerge.disconnect(this.saturatorDryGain);
    } catch {
      /* ok */
    }
    try {
      this.saturatorMerge.disconnect(this.outputNode);
    } catch {
      /* ok */
    }
    try {
      this.saturatorShaper.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.saturatorToneFilter.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.saturatorWetGain.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.saturatorDryGain.disconnect();
    } catch {
      /* ok */
    }

    if (bypassed) {
      this.saturatorMerge.connect(this.outputNode);
    } else {
      // Wet: shaper → tone filter → wetGain → output
      this.saturatorMerge.connect(this.saturatorShaper);
      this.saturatorShaper.connect(this.saturatorToneFilter);
      this.saturatorToneFilter.connect(this.saturatorWetGain);
      this.saturatorWetGain.connect(this.outputNode);
      // Dry path
      this.saturatorMerge.connect(this.saturatorDryGain);
      this.saturatorDryGain.connect(this.outputNode);
    }
    this.saturatorBypassed = bypassed;
  }

  // ── Update parameters ─────────────────────────────────────────────────

  update(newState: TrackEffectState): void {
    // Reverb (true bypass)
    const wantReverbBypass = !newState.reverb.enabled;
    if (wantReverbBypass !== this.reverbBypassed) {
      this.wireReverbBypass(wantReverbBypass);
    }
    if (newState.reverb.enabled) {
      if (
        newState.reverb.decay !== this.state.reverb.decay ||
        newState.reverb.type !== this.state.reverb.type
      ) {
        this.reverbConvolver.buffer = generateImpulseResponse(
          this.ctx,
          newState.reverb.decay,
          newState.reverb.type,
        );
      }
      this.reverbPreDelay.delayTime.value = newState.reverb.preDelay / 1000;
      this.reverbHighPass.frequency.value = newState.reverb.highPass;
      this.reverbLowPass.frequency.value = newState.reverb.lowPass;
      this.reverbWetGain.gain.value = newState.reverb.wet;
      this.reverbDryGain.gain.value = 1 - newState.reverb.wet;
    }

    // EQ (8-band parametric, with cascaded filter groups)
    let needsRebuild = false;

    for (let i = 0; i < newState.eq.bands.length; i++) {
      const band = newState.eq.bands[i];
      const oldBand = this.state.eq.bands[i];
      const isCut = band.type === 'lowcut' || band.type === 'highcut';

      if (isCut && (band.slope ?? 12) !== (oldBand?.slope ?? 12)) {
        this.eqFilterGroups[i].forEach((f) => f.disconnect());
        this.eqFilterGroups[i] = this.createFilterGroup(band);
        needsRebuild = true;
      }

      for (const filter of this.eqFilterGroups[i]) {
        if (!newState.eq.enabled || !band.enabled) {
          if (band.type === 'lowcut') {
            filter.frequency.value = 1;
          } else if (band.type === 'highcut') {
            filter.frequency.value = 22050;
          } else {
            filter.frequency.value = band.freq;
            filter.gain.value = 0;
          }
          filter.Q.value = band.Q;
        } else {
          filter.frequency.value = band.freq;
          filter.gain.value = band.gain;
          filter.Q.value = band.Q;
        }
      }
    }

    if (needsRebuild) {
      this.buildChain();
    }

    // EQ makeup gain
    this.eqMakeupGain.gain.value = newState.eq.enabled
      ? Math.pow(10, newState.eq.makeup / 20)
      : 1;

    // Gate — params are read by the polling loop in startGateLoop()
    // Just ensure gate gain is 1 when disabled
    if (!newState.gate.enabled && this.state.gate.enabled) {
      this.gateGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gateGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
      this.gateOpen = true;
    }

    // Compressor
    if (newState.compressor.enabled) {
      this.compressor.threshold.value = newState.compressor.threshold;
      this.compressor.ratio.value = newState.compressor.ratio;
      this.compressor.knee.value = newState.compressor.knee;
      this.compressor.attack.value = newState.compressor.attack;
      this.compressor.release.value = newState.compressor.release;
    } else {
      this.compressor.threshold.value = 0;
      this.compressor.ratio.value = 1;
    }

    // Crush (saturation)
    if (newState.compressor.enabled && newState.compressor.crush > 0) {
      this.crushNode.curve = generateCrushCurve(
        newState.compressor.crush,
      ) as Float32Array<ArrayBuffer>;
    } else {
      this.crushNode.curve = generateCrushCurve(0) as Float32Array<ArrayBuffer>;
    }

    // Makeup gain
    if (newState.compressor.enabled) {
      let makeupDb = newState.compressor.makeup;
      if (newState.compressor.auto) {
        // Auto makeup: compensate for gain reduction
        makeupDb =
          (-newState.compressor.threshold *
            (1 - 1 / newState.compressor.ratio)) /
          2;
      }
      this.makeupGain.gain.value = Math.pow(10, makeupDb / 20);
    } else {
      this.makeupGain.gain.value = 1;
    }

    // Presence (true bypass — peaking EQ boost)
    const wantPresenceBypass = !newState.presence.enabled;
    if (wantPresenceBypass !== this.presenceBypassed) {
      this.wirePresenceBypass(wantPresenceBypass);
    }
    if (newState.presence.enabled) {
      this.presenceFilter.frequency.value = newState.presence.frequency;
      this.presenceFilter.Q.value = newState.presence.bandwidth;
      // amount 0–100 maps to gain 0–12 dB
      this.presenceFilter.gain.value = (newState.presence.amount / 100) * 12;
    }

    // De-Esser (true bypass — compressor on full signal, triggered by HF)
    const wantDeEsserBypass = !newState['de-esser'].enabled;
    if (wantDeEsserBypass !== this.deEsserBypassed) {
      this.wireDeEsserBypass(wantDeEsserBypass);
    }
    if (newState['de-esser'].enabled) {
      this.deEsserFilter.frequency.value = newState['de-esser'].frequency;
      // amount 0–100 maps to threshold 0 to -40 dB
      this.deEsserCompressor.threshold.value =
        -(newState['de-esser'].amount / 100) * 40;
      this.deEsserCompressor.ratio.value =
        4 + (newState['de-esser'].range / 20) * 16; // 4:1 to 20:1
      // Wet/dry blend: more amount = more wet (compressed) signal
      const wetAmount = newState['de-esser'].amount / 100;
      this.deEsserWetGain.gain.value = wetAmount;
      this.deEsserDryGain.gain.value = 1 - wetAmount;
    }

    // Delay (true bypass)
    const wantDelayBypass = !newState.delay.enabled;
    if (wantDelayBypass !== this.delayBypassed) {
      this.wireDelayBypass(wantDelayBypass);
    }
    if (newState.delay.enabled) {
      this.delayNode.delayTime.value = newState.delay.time;
      this.delayFeedback.gain.value = Math.min(0.95, newState.delay.feedback);
      this.delayWetGain.gain.value = newState.delay.wet;
      this.delayDryGain.gain.value = 1 - newState.delay.wet;
    }

    // Saturator (true bypass — waveshaper with dry/wet mix and tone)
    const wantSaturatorBypass = !newState.saturator.enabled;
    if (wantSaturatorBypass !== this.saturatorBypassed) {
      this.wireSaturatorBypass(wantSaturatorBypass);
    }
    if (newState.saturator.enabled) {
      // drive 0–100 maps to crush curve 0–1
      this.saturatorShaper.curve = generateCrushCurve(
        newState.saturator.drive / 100,
      ) as Float32Array<ArrayBuffer>;
      // tone 0–100 maps to lowpass freq 2000–20000 Hz
      this.saturatorToneFilter.frequency.value =
        2000 + (newState.saturator.tone / 100) * 18000;
      // mix 0–100 maps to wet/dry blend
      const mix = newState.saturator.mix / 100;
      this.saturatorWetGain.gain.value = mix;
      this.saturatorDryGain.gain.value = 1 - mix;
    }

    this.state = structuredClone(newState);
  }

  dispose(): void {
    this.stopGateLoop();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.reverbConvolver.disconnect();
    this.reverbWetGain.disconnect();
    this.reverbDryGain.disconnect();
    this.reverbMerge.disconnect();
    this.eqFilterGroups.forEach((group) =>
      group.forEach((f) => f.disconnect()),
    );
    this.eqMakeupGain.disconnect();
    this.gateAnalyser.disconnect();
    this.gateGain.disconnect();
    this.compressor.disconnect();
    this.crushNode.disconnect();
    this.makeupGain.disconnect();
    this.preCompAnalyser.disconnect();
    this.postCompAnalyser.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.delayWetGain.disconnect();
    this.delayDryGain.disconnect();
    this.delayMerge.disconnect();
    this.presenceFilter.disconnect();
    this.deEsserFilter.disconnect();
    this.deEsserCompressor.disconnect();
    this.deEsserDryGain.disconnect();
    this.deEsserWetGain.disconnect();
    this.deEsserMerge.disconnect();
    this.saturatorShaper.disconnect();
    this.saturatorToneFilter.disconnect();
    this.saturatorDryGain.disconnect();
    this.saturatorWetGain.disconnect();
    this.saturatorMerge.disconnect();
  }
}
