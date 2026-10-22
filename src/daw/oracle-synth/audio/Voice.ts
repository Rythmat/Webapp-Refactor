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
import {
  Envelope,
  EnvelopeSegment,
  envelopeLevelAt,
  fadeOutSegment,
  holdSegment,
} from './Envelope';
import { WavetableBank } from './WavetableBank';
import { ANTI_CLICK_TIME, smoothParam } from './constants';

const SOURCE_IDS: SourceId[] = ['osc1', 'osc2', 'sub', 'noise'];

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
 *
 * Timing: every note event takes a context time. Sources start at the note's
 * time and stop at the end of the release (or a steal's short fade); the
 * voice's state is computed from those times (stateAt), so a voice is
 * 'releasing' only from its scheduled release and 'free' once its sources
 * have stopped, which also works in an offline render, where every event is
 * scheduled before any audio runs.
 */
export type VoiceModSourceKind = 'velocity' | 'keytrack' | 'env1' | 'env2';

export class Voice {
  readonly id: number;
  currentNote: number = -1;
  currentVelocity: number = 0;
  /** Context time of the current note's start (or its last retrigger). */
  noteOnAt: number = -Infinity;
  /** Context time the release (or a steal's fade) starts; Infinity while held. */
  releaseAt: number = Infinity;
  /** Context time the sources stop; the voice is free from then on. */
  endAt: number = -Infinity;
  /** Bumped on every fresh note, so a stale onended is ignored. */
  private generation: number = 0;
  /** The sources started for the current note. */
  private noteSources: Array<Oscillator | SubOscillator | NoiseGenerator> = [];
  /** What is scheduled on each envelope-driven param, for exact levels. */
  private segments = new Map<AudioParam, EnvelopeSegment>();

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

    // Series: Filter 1 runs into Filter 2; parallel: both to the output.
    this.filter1.setDestination(
      this.routingConfig.filterRouting.serial ? flt2In : this.postFilterBus,
    );

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

  /** The voice's state at context time `t` (now when omitted). */
  stateAt(t?: number): VoiceState {
    const at = t ?? this.ctx.currentTime;
    // Reserved for a note that starts later than `at`.
    if (this.noteOnAt > at && this.endAt > at) return 'active';
    if (at >= this.endAt) return 'free';
    if (at >= this.releaseAt) return 'releasing';
    return 'active';
  }

  get state(): VoiceState {
    return this.stateAt();
  }

  /**
   * Starts a fresh note at `time` (now when omitted): new sources start at
   * `time` and the envelopes trigger from their floor. With a glide time and
   * `fromNote`, the pitch glides from that note starting at `time`.
   */
  noteOn(
    note: number,
    velocity: number,
    time?: number,
    glideTime?: number,
    fromNote?: number,
  ): void {
    const t = time ?? this.ctx.currentTime;
    this.generation++;
    this.currentNote = note;
    this.currentVelocity = velocity;
    this.noteOnAt = t;
    this.releaseAt = Infinity;
    this.endAt = Infinity;

    // Anything still current (a tail that ends by now) stops where this
    // note starts; then the enabled sources start at the note's time.
    this.stopAllSources(t);
    this.startActiveSources(t);

    this.setNoteFrequency(note, t, glideTime, fromNote);

    for (const sourceId of SOURCE_IDS) {
      const param = this.getEnvGainForSource(sourceId).gain;
      const envelope = this.getEnvelopeForSource(sourceId);
      this.segments.set(
        param,
        envelope
          ? envelope.trigger(param, velocity, this.ctx, t)
          : // No envelope — hold the gain at velocity
            holdSegment(param, velocity, t),
      );
    }

    this.setNoteModSources(note, velocity, t);
    // Envelope contours at peak 1 (velocity is its own source)
    const env1 = this.env1ModSource.offset;
    const env2 = this.env2ModSource.offset;
    this.segments.set(env1, this.ampEnvelope.trigger(env1, 1, this.ctx, t));
    this.segments.set(env2, this.modEnvelope.trigger(env2, 1, this.ctx, t));
  }

  /**
   * Mono retrigger: the sounding sources keep running, the pitch moves (with
   * glide when given) and the envelopes restart from the level they have at
   * `time`, so there is no jump.
   */
  retrigger(
    note: number,
    velocity: number,
    time: number,
    glideTime?: number,
    fromNote?: number,
  ): void {
    this.currentNote = note;
    this.currentVelocity = velocity;
    this.noteOnAt = time;
    this.setNoteFrequency(note, time, glideTime, fromNote);
    for (const sourceId of SOURCE_IDS) {
      const param = this.getEnvGainForSource(sourceId).gain;
      const envelope = this.getEnvelopeForSource(sourceId);
      const prev = this.segments.get(param) ?? null;
      this.segments.set(
        param,
        envelope
          ? envelope.trigger(param, velocity, this.ctx, time, prev)
          : holdSegment(param, velocity, time),
      );
    }
    this.setNoteModSources(note, velocity, time);
    const env1 = this.env1ModSource.offset;
    const env2 = this.env2ModSource.offset;
    this.segments.set(
      env1,
      this.ampEnvelope.trigger(
        env1,
        1,
        this.ctx,
        time,
        this.segments.get(env1),
      ),
    );
    this.segments.set(
      env2,
      this.modEnvelope.trigger(
        env2,
        1,
        this.ctx,
        time,
        this.segments.get(env2),
      ),
    );
  }

  /** Legato: only the pitch (and key tracking) moves; envelopes keep going. */
  glideTo(
    note: number,
    time: number,
    glideTime?: number,
    fromNote?: number,
  ): void {
    this.currentNote = note;
    this.setNoteFrequency(note, time, glideTime, fromNote);
    this.keytrackSource.offset.cancelScheduledValues(time);
    this.keytrackSource.offset.setValueAtTime(note / 127, time);
  }

  /**
   * Releases at `time` (now when omitted) from the level each envelope has
   * at that time. The sources stop once the release has decayed (about six
   * time constants), and the voice is free from then on.
   */
  noteOff(time?: number): void {
    const t = time ?? this.ctx.currentTime;
    if (this.releaseAt !== Infinity || this.endAt <= t) return;

    let tail = 0;
    let hasEnvelope = false;
    for (const sourceId of SOURCE_IDS) {
      const envelope = this.getEnvelopeForSource(sourceId);
      if (!envelope) continue;
      const param = this.getEnvGainForSource(sourceId).gain;
      this.segments.set(
        param,
        envelope.release(param, this.ctx, t, this.segments.get(param)),
      );
      tail = Math.max(tail, envelope.getTailTime());
      hasEnvelope = true;
    }
    // If no envelopes are assigned at all, use a short fade-out
    if (!hasEnvelope) tail = ANTI_CLICK_TIME;

    // Sources with no envelope hold their gain until the end, then fade
    // over the anti-click time so the stop doesn't click.
    const fadeAt = t + tail - ANTI_CLICK_TIME;
    for (const sourceId of SOURCE_IDS) {
      if (this.getEnvelopeForSource(sourceId)) continue;
      const param = this.getEnvGainForSource(sourceId).gain;
      this.segments.set(
        param,
        fadeOutSegment(param, this.segments.get(param) ?? null, fadeAt),
      );
    }

    // Release the per-voice envelope mod sources
    const env1 = this.env1ModSource.offset;
    const env2 = this.env2ModSource.offset;
    this.segments.set(
      env1,
      this.ampEnvelope.release(env1, this.ctx, t, this.segments.get(env1)),
    );
    this.segments.set(
      env2,
      this.modEnvelope.release(env2, this.ctx, t, this.segments.get(env2)),
    );

    this.releaseAt = t;
    this.endAt = t + tail;
    this.stopAllSources(this.endAt, this.endCallback());
  }

  /**
   * Silences the voice with a short fade starting at `time` (now when
   * omitted), from the level it has there; the sources stop when the fade
   * ends. Used for steals and panic.
   */
  forceStop(time?: number): void {
    const t = time ?? this.ctx.currentTime;
    if (this.endAt <= t) return;
    const params = [
      ...SOURCE_IDS.map((id) => this.getEnvGainForSource(id).gain),
      this.env1ModSource.offset,
      this.env2ModSource.offset,
    ];
    for (const param of params) {
      this.segments.set(
        param,
        fadeOutSegment(param, this.segments.get(param) ?? null, t),
      );
    }
    this.releaseAt = Math.min(this.releaseAt, t);
    this.endAt = Math.min(this.endAt, t + ANTI_CLICK_TIME);
    this.stopAllSources(this.endAt, this.endCallback());
  }

  /** The level an envelope-driven gain has at `time` (for tests/meters). */
  levelAt(sourceId: SourceId, time: number): number {
    const seg = this.segments.get(this.getEnvGainForSource(sourceId).gain);
    return seg ? envelopeLevelAt(seg, time) : 0;
  }

  private setNoteFrequency(
    note: number,
    time: number,
    glideTime?: number,
    fromNote?: number,
  ): void {
    this.osc1.setFrequency(note, glideTime, time, fromNote);
    this.osc2.setFrequency(note, glideTime, time, fromNote);
    this.sub.setFrequency(note, glideTime, time, fromNote);
  }

  private setNoteModSources(note: number, velocity: number, time: number) {
    this.velocitySource.offset.cancelScheduledValues(time);
    this.velocitySource.offset.setValueAtTime(velocity, time);
    this.keytrackSource.offset.cancelScheduledValues(time);
    this.keytrackSource.offset.setValueAtTime(note / 127, time);
  }

  /** onEnd for the current note, ignored if the voice has moved on. */
  private endCallback(): () => void {
    const generation = this.generation;
    return () => {
      if (this.generation !== generation) return;
      this.currentNote = -1;
      this.currentVelocity = 0;
      this.onEnd?.();
    };
  }

  private startActiveSources(time: number): void {
    const started: Array<Oscillator | SubOscillator | NoiseGenerator> = [];
    if (this.osc1Enabled) started.push(this.osc1);
    if (this.osc2Enabled) started.push(this.osc2);
    if (this.subEnabled) started.push(this.sub);
    if (this.noiseEnabled) started.push(this.noise);
    for (const source of started) source.start(time);
    this.noteSources = started;
  }

  /**
   * Stops every source at `time`. `onEnded` goes to the first source started
   * for the current note that has something to stop (they all stop
   * together), never to the old tail of a source switched off since; with
   * nothing to wait for it runs right away.
   */
  private stopAllSources(time: number, onEnded?: () => void): void {
    let pending = onEnded;
    for (const source of [this.osc1, this.osc2, this.sub, this.noise]) {
      const ownsNote = this.noteSources.includes(source);
      if (source.stop(time, ownsNote ? pending : undefined) && ownsNote) {
        pending = undefined;
      }
    }
    pending?.();
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
    // setParams re-pitches the oscillator itself when its tuning changes.
    osc.setParams(params);
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

  isActive(t?: number): boolean {
    return this.stateAt(t) === 'active';
  }

  isReleasing(t?: number): boolean {
    return this.stateAt(t) === 'releasing';
  }

  isFree(t?: number): boolean {
    return this.stateAt(t) === 'free';
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
  /**
   * A per-voice modulation source's value at context time `time`, as its
   * node carries it: the note's velocity, its key (note / 127), or an
   * envelope's contour (0..1). For the engine's control-rate destinations
   * and the synth card's live view (liveModulation.ts).
   */
  modSourceValueAt(kind: VoiceModSourceKind, time: number): number {
    switch (kind) {
      case 'velocity':
        return this.currentVelocity;
      case 'keytrack':
        return this.currentNote < 0 ? 0 : this.currentNote / 127;
      case 'env1':
      case 'env2': {
        const node = kind === 'env1' ? this.env1ModSource : this.env2ModSource;
        const seg = this.segments.get(node.offset);
        return seg ? envelopeLevelAt(seg, time) : 0;
      }
    }
  }

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

  /** Spread-pan slot position, from `time` (now when omitted). */
  setSpreadPan(pan: number, time?: number): void {
    smoothParam(this.voicePanner.pan, pan, this.ctx, 0.01, time);
  }

  connectOscAnalysers(osc1Dest: AudioNode, osc2Dest: AudioNode): void {
    this.osc1.connectToAnalyser(osc1Dest);
    this.osc2.connectToAnalyser(osc2Dest);
  }

  connectNoiseAnalyser(dest: AudioNode): void {
    this.noise.connectToAnalyser(dest);
  }

  setPitchBendCents(cents: number, time?: number): void {
    this.osc1.setPitchBendCents(cents, time);
    this.osc2.setPitchBendCents(cents, time);
    this.sub.setPitchBendCents(cents, time);
  }

  connectVibratoSource(source: AudioNode): void {
    this.osc1.connectVibratoSource(source);
    this.osc2.connectVibratoSource(source);
    this.sub.connectVibratoSource(source);
  }
}
