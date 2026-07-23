import {
  VoiceState,
  OscillatorParams,
  SubOscillatorParams,
  NoiseParams,
  FilterParams,
  EnvelopeParams,
  RoutingConfig,
  SourceId,
} from './types';
import { Oscillator } from './Oscillator';
import { SubOscillator } from './SubOscillator';
import { NoiseGenerator } from './NoiseGenerator';
import { Filter } from './Filter';
import { Envelope } from './Envelope';
import { WavetableBank } from './WavetableBank';
import { ANTI_CLICK_TIME, smoothParam } from './constants';

const DEFAULT_ROUTING: RoutingConfig = {
  filterRouting: {
    filter1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    filter2Sources: [],
  },
  envelopeRouting: {
    env1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    env2Sources: [],
  },
};

/**
 * Full polyphonic voice with configurable routing:
 *
 * Per source:
 *   source → sourceEnvGain → [flt1Input / flt2Input / bypassBus]
 *
 * flt1Input → Filter1 → postFilterBus
 * flt2Input → Filter2 → postFilterBus
 * bypassBus ──────────→ postFilterBus
 *
 * postFilterBus → OutputGain → Panner → destination
 */
export type VoiceModSourceKind = 'velocity' | 'keytrack' | 'env1' | 'env2';

export class Voice {
  readonly id: number;
  state: VoiceState = 'free';
  currentNote: number = -1;
  currentVelocity: number = 0;
  assignedAt: number = 0;

  /** Invoked when the voice returns to 'free' — used by the modulation
   *  matrix to tear down this voice's connections. */
  onEnd: (() => void) | null = null;

  private ctx: AudioContext;

  // Per-voice modulation sources (always-running ConstantSources whose
  // offset carries the value/contour; the matrix connects scalers to them)
  private velocitySource: ConstantSourceNode;
  private keytrackSource: ConstantSourceNode;
  private env1ModSource: ConstantSourceNode;
  private env2ModSource: ConstantSourceNode;

  // Sources
  private osc1: Oscillator;
  private osc2: Oscillator;
  private sub: SubOscillator;
  private noise: NoiseGenerator;

  // Per-source envelope gains (replace mixBus + ampEnvGain)
  private osc1EnvGain: GainNode;
  private osc2EnvGain: GainNode;
  private subEnvGain: GainNode;
  private noiseEnvGain: GainNode;

  // Routing buses
  private bypassBus: GainNode;
  private postFilterBus: GainNode;

  // Filters (parallel — both output to postFilterBus)
  private filter1: Filter;
  private filter2: Filter;

  // Envelopes
  private ampEnvelope: Envelope;
  private modEnvelope: Envelope;

  // Output
  private outputGain: GainNode;
  private voicePanner: StereoPannerNode;

  // Track enabled state
  private osc1Enabled: boolean = true;
  private osc2Enabled: boolean = false;
  private subEnabled: boolean = false;
  private noiseEnabled: boolean = false;

  // Routing config
  private routingConfig: RoutingConfig = DEFAULT_ROUTING;

  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private forceStopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    ctx: AudioContext,
    id: number,
    wavetableBank: WavetableBank,
    destination: AudioNode,
  ) {
    this.ctx = ctx;
    this.id = id;

    // Output: outputGain → voicePanner → destination
    this.voicePanner = ctx.createStereoPanner();
    this.voicePanner.pan.value = 0;
    this.voicePanner.connect(destination);

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 1;
    this.outputGain.connect(this.voicePanner);

    // Post-filter summing bus
    this.postFilterBus = ctx.createGain();
    this.postFilterBus.gain.value = 1;
    this.postFilterBus.connect(this.outputGain);

    // Bypass bus (sources not assigned to any filter)
    this.bypassBus = ctx.createGain();
    this.bypassBus.gain.value = 1;
    this.bypassBus.connect(this.postFilterBus);

    // Filters (parallel — both output to postFilterBus)
    this.filter1 = new Filter(ctx, this.postFilterBus);
    this.filter2 = new Filter(ctx, this.postFilterBus);

    // Per-source envelope gains (start at 0, envelope controls amplitude)
    this.osc1EnvGain = ctx.createGain();
    this.osc1EnvGain.gain.value = 0;

    this.osc2EnvGain = ctx.createGain();
    this.osc2EnvGain.gain.value = 0;

    this.subEnvGain = ctx.createGain();
    this.subEnvGain.gain.value = 0;

    this.noiseEnvGain = ctx.createGain();
    this.noiseEnvGain.gain.value = 0;

    // Apply default routing (all sources → filter1)
    this.applyFilterRouting();

    // Sources connect to their envelope gains
    this.osc1 = new Oscillator(ctx, wavetableBank, this.osc1EnvGain);
    this.osc2 = new Oscillator(ctx, wavetableBank, this.osc2EnvGain);
    this.sub = new SubOscillator(ctx, this.subEnvGain);
    this.noise = new NoiseGenerator(ctx, this.noiseEnvGain);

    // Envelopes
    this.ampEnvelope = new Envelope();
    this.modEnvelope = new Envelope({
      attack: 0.01,
      decay: 0.5,
      sustain: 0.5,
      release: 0.5,
    });

    // Per-voice modulation sources — started once, live for the voice's
    // lifetime. Their offsets are driven at note events; they output
    // nothing audible (only connected via matrix scalers).
    this.velocitySource = ctx.createConstantSource();
    this.velocitySource.offset.value = 0;
    this.velocitySource.start();

    this.keytrackSource = ctx.createConstantSource();
    this.keytrackSource.offset.value = 0;
    this.keytrackSource.start();

    this.env1ModSource = ctx.createConstantSource();
    this.env1ModSource.offset.value = 0;
    this.env1ModSource.start();

    this.env2ModSource = ctx.createConstantSource();
    this.env2ModSource.offset.value = 0;
    this.env2ModSource.start();
  }

  private getEnvGainForSource(sourceId: SourceId): GainNode {
    switch (sourceId) {
      case 'osc1':
        return this.osc1EnvGain;
      case 'osc2':
        return this.osc2EnvGain;
      case 'sub':
        return this.subEnvGain;
      case 'noise':
        return this.noiseEnvGain;
    }
  }

  private applyFilterRouting(): void {
    const allEnvGains = [
      this.osc1EnvGain,
      this.osc2EnvGain,
      this.subEnvGain,
      this.noiseEnvGain,
    ];
    const allSourceIds: SourceId[] = ['osc1', 'osc2', 'sub', 'noise'];
    const flt1In = this.filter1.getInputNode();
    const flt2In = this.filter2.getInputNode();

    // Disconnect all source envGains from filter inputs and bypass
    for (const envGain of allEnvGains) {
      try {
        envGain.disconnect(flt1In);
      } catch {
        /* not connected */
      }
      try {
        envGain.disconnect(flt2In);
      } catch {
        /* not connected */
      }
      try {
        envGain.disconnect(this.bypassBus);
      } catch {
        /* not connected */
      }
    }

    // Reconnect based on routing config
    const { filter1Sources, filter2Sources } = this.routingConfig.filterRouting;
    for (const sourceId of allSourceIds) {
      const envGain = this.getEnvGainForSource(sourceId);
      const inFlt1 = filter1Sources.includes(sourceId);
      const inFlt2 = filter2Sources.includes(sourceId);

      if (inFlt1) envGain.connect(flt1In);
      if (inFlt2) envGain.connect(flt2In);
      if (!inFlt1 && !inFlt2) envGain.connect(this.bypassBus);
    }
  }

  private getEnvelopeForSource(sourceId: SourceId): Envelope | null {
    if (this.routingConfig.envelopeRouting.env1Sources.includes(sourceId)) {
      return this.ampEnvelope;
    }
    if (this.routingConfig.envelopeRouting.env2Sources.includes(sourceId)) {
      return this.modEnvelope;
    }
    return null; // no envelope assigned
  }

  noteOn(
    note: number,
    velocity: number,
    glideTime?: number,
    time?: number,
  ): void {
    this.state = 'active';
    this.currentNote = note;
    this.currentVelocity = velocity;
    this.assignedAt = Date.now();

    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    if (this.forceStopTimer) {
      clearTimeout(this.forceStopTimer);
      this.forceStopTimer = null;
    }

    // Stop and restart all sources
    this.stopAllSources();
    this.startActiveSources();

    // Set frequencies
    this.osc1.setFrequency(note, glideTime);
    this.osc2.setFrequency(note, glideTime);
    this.sub.setFrequency(note, glideTime);

    // Trigger per-source envelopes
    const allSourceIds: SourceId[] = ['osc1', 'osc2', 'sub', 'noise'];
    for (const sourceId of allSourceIds) {
      const envGain = this.getEnvGainForSource(sourceId);
      const envelope = this.getEnvelopeForSource(sourceId);

      if (envelope) {
        envelope.trigger(envGain.gain, velocity, this.ctx, time);
      } else {
        // No envelope — set gain to velocity directly
        const now = time ?? this.ctx.currentTime;
        envGain.gain.cancelScheduledValues(now);
        envGain.gain.setValueAtTime(velocity, now);
      }
    }

    // Drive per-voice modulation sources
    const startTime = time ?? this.ctx.currentTime;
    this.velocitySource.offset.cancelScheduledValues(startTime);
    this.velocitySource.offset.setValueAtTime(velocity, startTime);
    this.keytrackSource.offset.cancelScheduledValues(startTime);
    this.keytrackSource.offset.setValueAtTime(note / 127, startTime);
    // Envelope contours at peak 1 (velocity is its own source)
    this.ampEnvelope.trigger(this.env1ModSource.offset, 1, this.ctx, time);
    this.modEnvelope.trigger(this.env2ModSource.offset, 1, this.ctx, time);
  }

  noteOff(time?: number): void {
    if (this.state !== 'active') return;
    this.state = 'releasing';

    // Release per-source envelopes
    const allSourceIds: SourceId[] = ['osc1', 'osc2', 'sub', 'noise'];
    let maxRelease = 0;
    let hasEnvelope = false;

    for (const sourceId of allSourceIds) {
      const envGain = this.getEnvGainForSource(sourceId);
      const envelope = this.getEnvelopeForSource(sourceId);

      if (envelope) {
        envelope.release(envGain.gain, this.ctx, time);
        maxRelease = Math.max(maxRelease, envelope.getReleaseTime());
        hasEnvelope = true;
      }
      // Sources with no envelope keep their current gain (freed when voice stops)
    }

    // If no envelopes are assigned at all, use a short fade-out
    if (!hasEnvelope) {
      maxRelease = ANTI_CLICK_TIME;
      for (const sourceId of allSourceIds) {
        const envGain = this.getEnvGainForSource(sourceId);
        const now = time ?? this.ctx.currentTime;
        envGain.gain.cancelScheduledValues(now);
        envGain.gain.setValueAtTime(envGain.gain.value, now);
        envGain.gain.linearRampToValueAtTime(0, now + ANTI_CLICK_TIME);
      }
    }

    // Release the per-voice envelope mod sources
    this.ampEnvelope.release(this.env1ModSource.offset, this.ctx, time);
    this.modEnvelope.release(this.env2ModSource.offset, this.ctx, time);

    this.releaseTimer = setTimeout(
      () => {
        this.freeVoice();
      },
      maxRelease * 1000 + 100,
    );
  }

  forceStop(): void {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    if (this.forceStopTimer) {
      clearTimeout(this.forceStopTimer);
      this.forceStopTimer = null;
    }

    // Force-stop all source envGains
    const allEnvGains = [
      this.osc1EnvGain,
      this.osc2EnvGain,
      this.subEnvGain,
      this.noiseEnvGain,
    ];
    for (const envGain of allEnvGains) {
      const now = this.ctx.currentTime;
      envGain.gain.cancelScheduledValues(now);
      envGain.gain.setValueAtTime(envGain.gain.value, now);
      envGain.gain.linearRampToValueAtTime(0, now + ANTI_CLICK_TIME);
    }

    // Silence the envelope mod sources
    this.ampEnvelope.forceStop(this.env1ModSource.offset, this.ctx);
    this.modEnvelope.forceStop(this.env2ModSource.offset, this.ctx);

    this.forceStopTimer = setTimeout(
      () => {
        this.forceStopTimer = null;
        this.stopAllSources();
        this.state = 'free';
        this.currentNote = -1;
        this.onEnd?.();
      },
      ANTI_CLICK_TIME * 1000 + 10,
    );
  }

  private freeVoice(): void {
    this.stopAllSources();
    this.state = 'free';
    this.currentNote = -1;
    this.currentVelocity = 0;
    this.releaseTimer = null;
    this.onEnd?.();
  }

  private startActiveSources(): void {
    if (this.osc1Enabled) this.osc1.start();
    if (this.osc2Enabled) this.osc2.start();
    if (this.subEnabled) this.sub.start();
    if (this.noiseEnabled) this.noise.start();
  }

  private stopAllSources(): void {
    this.osc1.stop();
    this.osc2.stop();
    this.sub.stop();
    this.noise.stop();
  }

  // --- Routing ---

  setRouting(config: RoutingConfig): void {
    this.routingConfig = config;
    this.applyFilterRouting();
  }

  // --- Parameter setters ---

  setOscillatorParams(index: 0 | 1, params: Partial<OscillatorParams>): void {
    const osc = index === 0 ? this.osc1 : this.osc2;
    if (index === 0) this.osc1Enabled = params.enabled ?? this.osc1Enabled;
    if (index === 1) this.osc2Enabled = params.enabled ?? this.osc2Enabled;
    osc.setParams(params);

    if (
      (params.octave !== undefined ||
        params.semitone !== undefined ||
        params.fine !== undefined) &&
      this.currentNote >= 0
    ) {
      osc.setFrequency(this.currentNote);
    }
  }

  setSubOscillatorParams(params: Partial<SubOscillatorParams>): void {
    this.subEnabled = params.enabled ?? this.subEnabled;
    this.sub.setParams(params);
    if (this.currentNote >= 0) {
      this.sub.setFrequency(this.currentNote);
    }
  }

  setNoiseParams(params: Partial<NoiseParams>): void {
    this.noiseEnabled = params.enabled ?? this.noiseEnabled;
    this.noise.setParams(params);
  }

  setFilterParams(index: 0 | 1, params: Partial<FilterParams>): void {
    const filter = index === 0 ? this.filter1 : this.filter2;
    filter.setParams(params);
  }

  setEnvelopeParams(index: 0 | 1, params: Partial<EnvelopeParams>): void {
    if (index === 0) {
      this.ampEnvelope.setParams(params);
    } else {
      this.modEnvelope.setParams(params);
    }
  }

  isActive(): boolean {
    return this.state === 'active';
  }

  isReleasing(): boolean {
    return this.state === 'releasing';
  }

  isFree(): boolean {
    return this.state === 'free';
  }

  getFilter1(): Filter {
    return this.filter1;
  }

  getFilter2(): Filter {
    return this.filter2;
  }

  getOsc1(): Oscillator {
    return this.osc1;
  }

  getOsc2(): Oscillator {
    return this.osc2;
  }

  getSub(): SubOscillator {
    return this.sub;
  }

  /** Swap sounding oscillators onto freshly-loaded imported wavetables. */
  refreshWavetables(): void {
    this.osc1.reapplyWavetable();
    this.osc2.reapplyWavetable();
  }

  getNoise(): NoiseGenerator {
    return this.noise;
  }

  /** Per-voice modulation source node for the matrix. */
  getModSourceNode(kind: VoiceModSourceKind): AudioNode {
    switch (kind) {
      case 'velocity':
        return this.velocitySource;
      case 'keytrack':
        return this.keytrackSource;
      case 'env1':
        return this.env1ModSource;
      case 'env2':
        return this.env2ModSource;
    }
  }

  /**
   * Final teardown: stops the always-running per-voice mod sources.
   * Started source nodes are protected from GC, so skipping this leaks
   * four ConstantSources per voice on engine teardown.
   */
  dispose(): void {
    this.forceStop();
    const sources = [
      this.velocitySource,
      this.keytrackSource,
      this.env1ModSource,
      this.env2ModSource,
    ];
    for (const src of sources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        /* already stopped */
      }
    }
  }

  setSpreadPan(pan: number): void {
    smoothParam(this.voicePanner.pan, pan, this.ctx);
  }

  connectOscAnalysers(osc1Dest: AudioNode, osc2Dest: AudioNode): void {
    this.osc1.connectToAnalyser(osc1Dest);
    this.osc2.connectToAnalyser(osc2Dest);
  }

  connectNoiseAnalyser(dest: AudioNode): void {
    this.noise.connectToAnalyser(dest);
  }

  setPitchBendCents(cents: number): void {
    this.osc1.setPitchBendCents(cents);
    this.osc2.setPitchBendCents(cents);
    this.sub.setPitchBendCents(cents);
  }

  connectVibratoSource(source: AudioNode): void {
    this.osc1.connectVibratoSource(source);
    this.osc2.connectVibratoSource(source);
    this.sub.connectVibratoSource(source);
  }
}
