import {
  OscillatorParams,
  EnvelopeParams,
  VoiceMode,
  FilterParams,
  SubOscillatorParams,
  NoiseParams,
  LFONode,
  ModRoute,
  ModSourceRef,
  MACRO_COUNT,
  ChorusParams,
  DelayParams,
  PhaserParams,
  CompressorParams,
  DriveParams,
  ReverbParams,
  RoutingConfig,
  ArpParams,
} from './types';
import { Voice } from './Voice';
import { VoiceManager } from './VoiceManager';
import { Filter } from './Filter';
import { WavetableBank } from './WavetableBank';
import { LFO } from './LFO';
import {
  ModulationMatrix,
  ResolvedSource,
  TargetResolver,
  TransformProvider,
} from './ModulationMatrix';
import { migrateModRoute } from './modMath';
import {
  CONTROL_RATE_PARAMS,
  liveOffsets,
  type ModSourceRead,
} from './liveModulation';
import { ensureFramesLoaded } from './wavetableImport';
import { ScaleQuantizer, SnapMode } from './ScaleQuantizer';
import {
  makeScalePitchTransform,
  SCALE_PITCH_TRANSFORM_ID,
} from './ScalePitchModTransform';
import { MidiHandler } from './MidiHandler';
import { Arpeggiator } from './Arpeggiator';
import { FXChain } from './fx/FXChain';
import { DEFAULT_VOICE_COUNT, smoothParam } from './constants';

/** A modulation source registered with the engine. */
export interface ModSourceProvider {
  scope: 'global' | 'perVoice';
  /** True when the source's native output is -1..1 (vs 0..1). */
  bipolar: boolean;
  resolve: (ref: ModSourceRef, voice: Voice) => AudioNode | null;
}

/** An OfflineAudioContext (or a proxy of one) renders without a wall clock. */
function isOfflineContext(ctx: BaseAudioContext): boolean {
  return (
    typeof (ctx as { startRendering?: unknown }).startRendering === 'function'
  );
}

/** Which path started a held key, so its note-off goes the same way. */
type KeyPath = 'raw' | 'arp';

/**
 * Top-level audio engine facade.
 * Creates AudioContext (or accepts external one for DAW integration),
 * manages WavetableBank, VoiceManager, and all parameter routing.
 *
 * Every note call takes an optional context time; the voices, the
 * arpeggiator and the release/fade logic all schedule from it, so the engine
 * plays the same way live, ahead of time from the sequencer, and in an
 * OfflineAudioContext.
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voiceManager: VoiceManager | null = null;
  private wavetableBank: WavetableBank | null = null;
  private analyser: AnalyserNode | null = null;
  private osc1Analyser: AnalyserNode | null = null;
  private osc2Analyser: AnalyserNode | null = null;
  private noiseAnalyser: AnalyserNode | null = null;
  private lfos: LFO[] = [];
  private modMatrix: ModulationMatrix | null = null;
  private midiHandler: MidiHandler | null = null;
  private fxChain: FXChain | null = null;
  private arpeggiator: Arpeggiator | null = null;
  private arpParams: ArpParams | null = null;
  private vibratoOsc: OscillatorNode | null = null;
  private vibratoDepth: GainNode | null = null;
  // Persistent visualization filters (see init) — NOT in the audio path
  private vizFilters: [Filter, Filter] | null = null;
  private vizSink: GainNode | null = null;
  private pitchBendRange: number = 200; // cents (2 semitones default)
  private currentPitchBend: number = 0; // -1..1
  private isInitialized = false;
  /** Bumped by releaseResources, so an init still awaiting gives up. */
  private initToken = 0;
  /** True when init made the context (and so dispose may close it). */
  private ownsContext = false;
  /** Held keys and the path (raw voices or arp) that started each. */
  /** `time` is the key's booked note-on time (a hand-over never precedes it). */
  private heldKeys = new Map<
    number,
    { velocity: number; path: KeyPath; time: number }
  >();

  // Snapshot of the last-applied per-voice params. Voices are created lazily
  // on note-on, and param setters only reach voices that already exist — so a
  // voice born after a preset load must be SEEDED with this snapshot in
  // onVoiceCreated, or it would sound the constructor default (INITIALIZE)
  // patch layered under the loaded preset.
  private voiceSeed: {
    osc: [Partial<OscillatorParams>, Partial<OscillatorParams>];
    sub: Partial<SubOscillatorParams>;
    noise: Partial<NoiseParams>;
    filter: [Partial<FilterParams>, Partial<FilterParams>];
    env: [Partial<EnvelopeParams>, Partial<EnvelopeParams>];
    routing: RoutingConfig | null;
  } = {
    osc: [{}, {}],
    sub: {},
    noise: {},
    filter: [{}, {}],
    env: [{}, {}],
    routing: null,
  };

  // Modulation sources owned by the engine
  private macroNodes: ConstantSourceNode[] = [];
  private modWheelNode: ConstantSourceNode | null = null;
  private audioModOscs: OscillatorNode[] = [];
  private modSourceProviders = new Map<string, ModSourceProvider>();
  private lfoAnalysers: (AnalyserNode | null)[] = [];
  private lfoReadBuffers = new Map<number, Float32Array>();
  /** The routes as the matrix has them (migrated). */
  private modRoutes: ModRoute[] = [];
  /** The control-rate driver for wtPos and blend (when a route aims at them). */
  private controlRateTimer: ReturnType<typeof setInterval> | null = null;
  /** What the driver last set on each voice, so it writes only changes. */
  private controlRateApplied = new WeakMap<Voice, number[]>();

  // Key/Scale lock — applied at the rawNoteOn/rawNoteOff choke point so it
  // covers every input path (sequenced, live MIDI, on-screen keys, arp)
  private scaleQuantizer = new ScaleQuantizer();

  private static readonly VIBRATO_RATE = 5.5; // Hz
  private static readonly VIBRATO_MAX_DEPTH = 50; // cents (half semitone)
  private static readonly AUDIO_MOD_OSC_FREQ = 55; // Hz (audio-rate source)

  async init(
    externalCtx?: AudioContext,
    options?: { disableMidi?: boolean },
  ): Promise<void> {
    if (this.isInitialized) return;

    const token = ++this.initToken;
    // An embedded engine never resumes the host's context: the host owns
    // its state (and an offline context has no resume at all).
    this.ownsContext = !externalCtx;
    const ctx = externalCtx ?? new AudioContext();
    this.ctx = ctx;
    if (this.ownsContext && ctx.state === 'suspended') {
      await ctx.resume();
      // Disposed while waiting: build nothing.
      if (token !== this.initToken) return;
    }

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // FX chain (inserted between master gain and analyser)
    this.fxChain = new FXChain(this.ctx);

    // Analyser for visualizers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    // Signal: masterGain → fxChain → analyser → destination
    this.masterGain.connect(this.fxChain.input);
    this.fxChain.output.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Visualization filters: persistent, out-of-path mirrors of the two
    // voice filters. Voice filters are created lazily with voices, so the
    // filter-response visualizer needs these to have something to draw at
    // mount. A dead-end zero-gain sink keeps them silent; a disconnected
    // biquad's getFrequencyResponse() still works (coefficient-based).
    this.vizSink = this.ctx.createGain();
    this.vizSink.gain.value = 0;
    this.vizFilters = [
      new Filter(this.ctx, this.vizSink),
      new Filter(this.ctx, this.vizSink),
    ];

    // Wavetable bank, shared by the context's synths
    this.wavetableBank = WavetableBank.forContext(this.ctx);

    // Voice manager with wavetable bank
    this.voiceManager = new VoiceManager(
      this.ctx,
      this.wavetableBank,
      this.masterGain,
      DEFAULT_VOICE_COUNT,
    );

    // Vibrato: sine LFO → depth gain → all voice oscillator detune params
    this.vibratoOsc = this.ctx.createOscillator();
    this.vibratoOsc.type = 'sine';
    this.vibratoOsc.frequency.value = SynthEngine.VIBRATO_RATE;
    this.vibratoDepth = this.ctx.createGain();
    this.vibratoDepth.gain.value = 0; // mod wheel at 0 = no vibrato
    this.vibratoOsc.connect(this.vibratoDepth);
    this.vibratoOsc.start();

    // Connect vibrato to all voices
    this.voiceManager.updateAllVoices((voice) => {
      voice.connectVibratoSource(this.vibratoDepth!);
    });

    // Per-oscillator analysers (side-chain taps on voice 0 for visualization)
    this.osc1Analyser = this.ctx.createAnalyser();
    this.osc1Analyser.fftSize = 2048;
    this.osc2Analyser = this.ctx.createAnalyser();
    this.osc2Analyser.fftSize = 2048;
    this.noiseAnalyser = this.ctx.createAnalyser();
    this.noiseAnalyser.fftSize = 2048;
    const voice0 = this.voiceManager.getVoice(0);
    if (voice0) {
      voice0.connectOscAnalysers(this.osc1Analyser, this.osc2Analyser);
      voice0.connectNoiseAnalyser(this.noiseAnalyser);
    }

    // 4 LFOs
    this.lfos = [];
    for (let i = 0; i < 4; i++) {
      const lfo = new LFO(this.ctx);
      lfo.start();
      this.lfos.push(lfo);
    }
    this.lfoAnalysers = [null, null, null, null];

    // Engine-owned modulation source nodes
    this.macroNodes = [];
    for (let i = 0; i < MACRO_COUNT; i++) {
      const node = this.ctx.createConstantSource();
      node.offset.value = 0;
      node.start();
      this.macroNodes.push(node);
    }
    this.modWheelNode = this.ctx.createConstantSource();
    this.modWheelNode.offset.value = 0;
    this.modWheelNode.start();
    const audioModOsc = this.ctx.createOscillator();
    audioModOsc.type = 'sine';
    audioModOsc.frequency.value = SynthEngine.AUDIO_MOD_OSC_FREQ;
    audioModOsc.start();
    this.audioModOscs = [audioModOsc];

    // Modulation matrix + built-in source registry
    this.modMatrix = new ModulationMatrix(this.ctx);
    this.registerBuiltInModSources();
    this.modMatrix.setSourceResolver((ref, voice): ResolvedSource | null => {
      const provider = this.modSourceProviders.get(ref.type);
      if (!provider) return null;
      const node = provider.resolve(ref, voice);
      return node ? { node, bipolar: provider.bipolar } : null;
    });

    // Scale-quantized pitch modulation (reads the Key/Scale lock's mask)
    this.modMatrix.registerTransform(
      SCALE_PITCH_TRANSFORM_ID,
      makeScalePitchTransform(() => this.scaleQuantizer.getMask()),
    );

    // Every lazily-created voice gets vibrato, matrix teardown, and (for
    // voice 0) the visualizer analyser taps. Voices are created lazily on
    // first note-on, so this hook — not init-time wiring — is what
    // actually reaches them.
    this.voiceManager.onVoiceCreated = (voice) => {
      // Seed the fresh voice with the current parameters FIRST (this runs
      // before the voice's first noteOn), so a voice created after a preset
      // load plays the preset — not the INITIALIZE default patch.
      const seed = this.voiceSeed;
      voice.setOscillatorParams(0, seed.osc[0]);
      voice.setOscillatorParams(1, seed.osc[1]);
      voice.setSubOscillatorParams(seed.sub);
      voice.setNoiseParams(seed.noise);
      voice.setFilterParams(0, seed.filter[0]);
      voice.setFilterParams(1, seed.filter[1]);
      voice.setEnvelopeParams(0, seed.env[0]);
      voice.setEnvelopeParams(1, seed.env[1]);
      if (seed.routing) voice.setRouting(seed.routing);
      voice.setPitchBendCents(this.currentPitchBend * this.pitchBendRange);

      if (this.vibratoDepth) voice.connectVibratoSource(this.vibratoDepth);
      voice.onEnd = () => this.modMatrix?.disconnectVoice(voice);
      if (voice.id === 0) {
        if (this.osc1Analyser && this.osc2Analyser) {
          voice.connectOscAnalysers(this.osc1Analyser, this.osc2Analyser);
        }
        if (this.noiseAnalyser) {
          voice.connectNoiseAnalyser(this.noiseAnalyser);
        }
      }
    };

    // A MONO/LEGATO key change keeps the voice; a scale-quantized pitch
    // route's curve is built from the voice's note, so it is rebuilt. (It is
    // rebuilt when the call runs, not at the key's booked time: modulation
    // routing is graph wiring, which can't be scheduled.)
    this.voiceManager.onPitchChange = (voice) => {
      if (this.modMatrix?.hasTransformRoutes()) {
        this.modMatrix.connectVoice(voice);
      }
    };

    // Arpeggiator (routes through rawNoteOn/rawNoteOff, with step times
    // on this context's clock)
    this.arpeggiator = new Arpeggiator(
      (note, vel, time) => this.rawNoteOn(note, vel, time),
      (note, time) => this.rawNoteOff(note, time),
      { now: () => ctx.currentTime, live: !isOfflineContext(ctx) },
    );
    if (this.arpParams) this.arpeggiator.setParams(this.arpParams);

    // MIDI handler — skip when embedded in a host DAW that handles MIDI routing
    if (!options?.disableMidi) {
      this.midiHandler = new MidiHandler(
        (note, velocity) => this.noteOn(note, velocity),
        (note) => this.noteOff(note),
        (cc, value) => this.handleMidiCC(cc, value),
      );
      this.midiHandler.init(); // fire-and-forget, works if MIDI available
    }

    this.isInitialized = true;
  }

  dispose(): void {
    this.releaseResources();
    // Only a context this engine made is closed; a host's shared context
    // (the DAW's, or an offline render's) is left alone.
    if (this.ownsContext && this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }

  /**
   * Tears down every engine-owned audio resource WITHOUT closing the
   * AudioContext. DAW-embedded engines live on the shared app context —
   * a full dispose() would close it, but skipping teardown leaks the
   * engine's running source nodes (vibrato osc, 4 LFOs, 8 macro sources,
   * mod wheel, audio-mod osc) on every track deletion/instrument switch.
   */
  releaseResources(): void {
    this.initToken++;
    this.stopControlRate();
    this.heldKeys.clear();
    this.midiHandler?.dispose();
    this.midiHandler = null;
    this.arpeggiator?.dispose();
    this.arpeggiator = null;
    if (this.voiceManager) {
      this.voiceManager.forceAllNotesOff();
      this.voiceManager.updateAllVoices((voice) => voice.dispose());
    }
    this.modMatrix?.dispose();
    this.modMatrix = null;
    for (const node of this.macroNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.macroNodes = [];
    if (this.modWheelNode) {
      try {
        this.modWheelNode.stop();
        this.modWheelNode.disconnect();
      } catch {
        /* already stopped */
      }
      this.modWheelNode = null;
    }
    for (const osc of this.audioModOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.audioModOscs = [];
    this.lfoAnalysers = [];
    if (this.vibratoOsc) {
      try {
        this.vibratoOsc.stop();
      } catch {
        /* already stopped */
      }
      this.vibratoOsc.disconnect();
      this.vibratoOsc = null;
    }
    if (this.vibratoDepth) {
      this.vibratoDepth.disconnect();
      this.vibratoDepth = null;
    }
    if (this.fxChain) {
      this.fxChain.dispose();
      this.fxChain = null;
    }
    if (this.vizFilters) {
      for (const filter of this.vizFilters) {
        filter.dispose();
      }
      this.vizFilters = null;
    }
    if (this.vizSink) {
      this.vizSink.disconnect();
      this.vizSink = null;
    }
    for (const lfo of this.lfos) {
      lfo.stop();
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    this.isInitialized = false;
    this.masterGain = null;
    this.voiceManager = null;
    this.wavetableBank = null;
    this.analyser = null;
    this.osc1Analyser = null;
    this.osc2Analyser = null;
    this.noiseAnalyser = null;
    this.lfos = [];
  }

  // --- Note I/O ---

  noteOn(note: number, velocity: number, time?: number): void {
    // A key pressed again without a note-off first lets go of the old one.
    if (this.heldKeys.has(note)) this.noteOff(note, time);
    const at = time ?? this.ctx?.currentTime ?? 0;
    if (this.arpParams?.enabled && this.arpeggiator) {
      this.arpeggiator.noteOn(note, velocity, time);
      this.heldKeys.set(note, { velocity, path: 'arp', time: at });
    } else {
      this.rawNoteOn(note, velocity, time);
      this.heldKeys.set(note, { velocity, path: 'raw', time: at });
    }
  }

  noteOff(note: number, time?: number): void {
    const held = this.heldKeys.get(note);
    this.heldKeys.delete(note);
    // The note-off goes to the path that started the key, even if the arp
    // was switched since; an unknown key follows the current setting.
    const path: KeyPath = held
      ? held.path
      : this.arpParams?.enabled
        ? 'arp'
        : 'raw';
    if (path === 'arp') {
      this.arpeggiator?.noteOff(note, time);
    } else {
      this.rawNoteOff(note, time);
    }
  }

  /** Releases every held note at `time` (now when omitted). */
  allNotesOff(time?: number): void {
    this.heldKeys.clear();
    this.arpeggiator?.allNotesOff(time);
    this.voiceManager?.allNotesOff(time);
    this.scaleQuantizer.clear();
  }

  /** Silences every voice with a short fade from `time` (now when omitted). */
  forceAllNotesOff(time?: number): void {
    this.heldKeys.clear();
    this.arpeggiator?.allNotesOff(time);
    this.voiceManager?.forceAllNotesOff(time);
    this.scaleQuantizer.clear();
  }

  // --- Key/Scale lock ---

  setKeyScale(mask: number, snap: SnapMode, enabled: boolean): void {
    this.scaleQuantizer.setScale(mask, snap, enabled);
  }

  getScaleQuantizer(): ScaleQuantizer {
    return this.scaleQuantizer;
  }

  private rawNoteOn(note: number, velocity: number, time?: number): void {
    const played = this.scaleQuantizer.mapNoteOn(note);
    const voice = this.voiceManager?.noteOn(played, velocity, time);
    if (voice && this.modMatrix) {
      this.modMatrix.connectVoice(voice);
    }
    // One-shot LFOs start over with each note (Serum's envelope mode).
    const at = time ?? this.ctx?.currentTime ?? 0;
    for (const lfo of this.lfos) lfo.trigger(at);
    // A new note starts at its modulated position, not a tick late.
    if (voice && this.controlRateTimer) {
      this.controlRateApplied.delete(voice);
      this.tickControlRate();
    }
  }

  private rawNoteOff(note: number, time?: number): void {
    const played = this.scaleQuantizer.mapNoteOff(note);
    // null = suppressed: another held key still sounds this output note
    if (played !== null) {
      this.voiceManager?.noteOff(played, time);
    }
  }

  // --- Parameter updates ---

  setOscillatorParams(index: 0 | 1, params: Partial<OscillatorParams>): void {
    Object.assign(this.voiceSeed.osc[index], params);
    // The patch's own values went to every voice: the control-rate driver
    // writes its offsets afresh on the next tick.
    if (params.wtPosition !== undefined || params.unisonBlend !== undefined) {
      this.controlRateApplied = new WeakMap();
    }
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setOscillatorParams(index, params);
    });
  }

  setSubOscillatorParams(params: Partial<SubOscillatorParams>): void {
    Object.assign(this.voiceSeed.sub, params);
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setSubOscillatorParams(params);
    });
  }

  setNoiseParams(params: Partial<NoiseParams>): void {
    Object.assign(this.voiceSeed.noise, params);
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setNoiseParams(params);
    });
  }

  setFilterParams(index: 0 | 1, params: Partial<FilterParams>): void {
    Object.assign(this.voiceSeed.filter[index], params);
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setFilterParams(index, params);
    });
    // Keep the visualization mirror in sync (see init)
    this.vizFilters?.[index]?.setParams(params);
  }

  setEnvelopeParams(index: 0 | 1, params: Partial<EnvelopeParams>): void {
    Object.assign(this.voiceSeed.env[index], params);
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setEnvelopeParams(index, params);
    });
  }

  setVoiceMode(mode: VoiceMode): void {
    this.voiceManager?.setVoiceMode(mode);
  }

  setVoiceCount(count: number): void {
    this.voiceManager?.setMaxVoices(count);
  }

  setSpread(spread: number): void {
    this.voiceManager?.setSpread(spread);
  }

  setGlide(time: number): void {
    this.voiceManager?.setGlideTime(time);
  }

  setMasterVolume(volume: number, time?: number): void {
    if (this.masterGain && this.ctx) {
      smoothParam(this.masterGain.gain, volume, this.ctx, 0.01, time);
    }
  }

  setBPM(bpm: number): void {
    for (const lfo of this.lfos) {
      lfo.setBPM(bpm);
    }
    this.arpeggiator?.setBPM(bpm);
  }

  /**
   * Arp settings. Switching the arp on or off while keys are held hands
   * them over: on, the raw voices are released and the keys seed the arp;
   * off, the arp stops and the keys still held play as plain notes.
   */
  setArpParams(params: ArpParams): void {
    const wasEnabled = this.arpParams?.enabled ?? false;
    this.arpParams = params;
    this.arpeggiator?.setParams(params);
    if (params.enabled === wasEnabled || !this.ctx) return;

    // A key the sequencer booked ahead of the clock is handed over at its
    // own time, never before it starts.
    const now = this.ctx.currentTime;
    const keys = [...this.heldKeys].sort((a, b) => a[1].time - b[1].time);
    if (params.enabled) {
      for (const [note, key] of keys) {
        if (key.path !== 'raw') continue;
        const at = Math.max(now, key.time);
        this.rawNoteOff(note, at);
        this.arpeggiator?.noteOn(note, key.velocity, at);
        key.path = 'arp';
      }
    } else {
      this.arpeggiator?.allNotesOff(now);
      for (const [note, key] of keys) {
        if (key.path !== 'arp') continue;
        this.rawNoteOn(note, key.velocity, Math.max(now, key.time));
        key.path = 'raw';
      }
    }
  }

  /** Live chord pitch classes from the DAW's music-intelligence bus. */
  setArpChordContext(chordPcs: number[] | null): void {
    this.arpeggiator?.setChordContext(chordPcs);
  }

  /**
   * Lines the LFOs' 4-bar loops up with the song: at context time `when`
   * the song is at `beat` (quarter notes from its start). The host calls it
   * on play, loop and seek.
   */
  alignLFOs(when: number, beat: number): void {
    for (const lfo of this.lfos) {
      lfo.alignToBeat(when, beat);
    }
  }

  /** An LFO loops (false) or plays once from each note-on (true). */
  setLFOOnce(lfoIndex: number, once: boolean): void {
    this.lfos[lfoIndex]?.setOnce(once);
  }

  setLFONodes(lfoIndex: number, barIndex: number, nodes: LFONode[]): void {
    this.lfos[lfoIndex]?.setBarNodes(barIndex, nodes);
  }

  setLFOSmooth(lfoIndex: number, barIndex: number, smooth: number): void {
    this.lfos[lfoIndex]?.setBarSmooth(barIndex, smooth);
  }

  getLFO(index: number): LFO | null {
    return this.lfos[index] ?? null;
  }

  setModRoutes(routes: ModRoute[]): void {
    if (!this.modMatrix) return;
    this.modRoutes = routes.map(migrateModRoute);
    this.updateControlRate();
    // An amount drag retunes the live connections; other edits rebuild.
    if (this.modMatrix.updateAmounts(this.modRoutes)) return;
    this.modMatrix.setRoutes(this.modRoutes);
    // Apply edits to already-sounding notes, not just the next note-on
    if (this.voiceManager) {
      this.modMatrix.reconnectActiveVoices(this.voiceManager.getActiveVoices());
    }
  }

  // --- Control-rate modulation (wtPos, blend) and the live readout ---
  //
  // A wavetable's position and unison blend aren't AudioParams, so the
  // matrix can't reach them: while a route aims at one, a ~30 Hz driver
  // works out each sounding voice's offset (liveModulation.ts) and sets the
  // voice's oscillator, leaving the patch's own value as the base.

  private static readonly CONTROL_RATE_MS = 33;

  private updateControlRate(): void {
    const needed = this.modRoutes.some(
      (r) =>
        r.enabled && !r.transform && CONTROL_RATE_PARAMS.has(r.target.param),
    );
    if (needed && !this.controlRateTimer) {
      this.controlRateTimer = setInterval(
        () => this.tickControlRate(),
        SynthEngine.CONTROL_RATE_MS,
      );
    } else if (!needed && this.controlRateTimer) {
      this.stopControlRate();
      // Back to the patch's own values.
      for (const index of [0, 1] as const) {
        const base = this.voiceSeed.osc[index];
        this.voiceManager?.updateAllVoices((voice) =>
          voice.setOscillatorParams(index, {
            wtPosition: base.wtPosition,
            unisonBlend: base.unisonBlend,
          }),
        );
      }
    }
  }

  private stopControlRate(): void {
    if (this.controlRateTimer) clearInterval(this.controlRateTimer);
    this.controlRateTimer = null;
  }

  /** A global source's value now: an LFO's, a macro's or the mod wheel's. */
  private readGlobalSource(route: ModRoute): number | null {
    switch (route.source.type) {
      case 'lfo': {
        const analyser = this.getLFOAnalyser(route.source.index);
        if (!analyser) return null;
        let buf = this.lfoReadBuffers.get(route.source.index);
        if (!buf || buf.length !== analyser.fftSize) {
          buf = new Float32Array(analyser.fftSize);
          this.lfoReadBuffers.set(route.source.index, buf);
        }
        analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        return buf[buf.length - 1];
      }
      case 'macro':
        return this.macroNodes[route.source.index]?.offset.value ?? null;
      case 'modwheel':
        return this.modWheelNode?.offset.value ?? null;
      default:
        return null;
    }
  }

  /** Reads every route's source for `voice` at context time `time`. */
  private sourceReader(voice: Voice, time: number): ModSourceRead {
    return (route) => {
      switch (route.source.type) {
        case 'envelope':
          return voice.modSourceValueAt(
            route.source.index === 0 ? 'env1' : 'env2',
            time,
          );
        case 'velocity':
          return voice.modSourceValueAt('velocity', time);
        case 'keytrack':
          return voice.modSourceValueAt('keytrack', time);
        default:
          return this.readGlobalSource(route);
      }
    };
  }

  private tickControlRate(): void {
    if (!this.ctx || !this.voiceManager) return;
    const now = this.ctx.currentTime;
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    for (const voice of this.voiceManager.getActiveVoices()) {
      const offsets = liveOffsets(
        this.modRoutes,
        this.sourceReader(voice, now),
        (r) => CONTROL_RATE_PARAMS.has(r.target.param),
      );
      const last = this.controlRateApplied.get(voice) ?? [];
      const next: number[] = [];
      for (const index of [0, 1] as const) {
        const base = this.voiceSeed.osc[index];
        const source = index === 0 ? 'osc1' : 'osc2';
        const position = clamp01(
          (base.wtPosition ?? 0) + (offsets.get(`${source}:wtPos`) ?? 0),
        );
        const blend = clamp01(
          (base.unisonBlend ?? 0) + (offsets.get(`${source}:blend`) ?? 0),
        );
        next.push(position, blend);
        const params: Partial<OscillatorParams> = {};
        if (Math.abs(position - (last[index * 2] ?? -1)) > 0.001) {
          params.wtPosition = position;
        }
        if (Math.abs(blend - (last[index * 2 + 1] ?? -1)) > 0.001) {
          params.unisonBlend = blend;
        }
        if (Object.keys(params).length) {
          voice.setOscillatorParams(index, params);
        }
      }
      this.controlRateApplied.set(voice, next);
    }
  }

  /**
   * What the routes add to each destination right now ('flt1:cutoff' →
   * cents, 'osc1:wtPos' → 0..1), as the latest sounding note has it; null
   * while no note sounds. The synth card draws its controls moving from it.
   */
  getLiveModulation(): Map<string, number> | null {
    if (!this.ctx || !this.voiceManager) return null;
    const now = this.ctx.currentTime;
    let focus: Voice | null = null;
    for (const voice of this.voiceManager.getActiveVoices()) {
      // A note scheduled ahead (a clip playing) hasn't started yet.
      if (voice.noteOnAt > now || voice.stateAt(now) === 'free') continue;
      if (!focus || voice.noteOnAt > focus.noteOnAt) focus = voice;
    }
    if (!focus) return null;
    return liveOffsets(this.modRoutes, this.sourceReader(focus, now));
  }

  // --- Modulation source registry ---

  private registerBuiltInModSources(): void {
    this.registerModSource('lfo', {
      scope: 'global',
      bipolar: false,
      resolve: (ref) => this.lfos[ref.index]?.getOutputNode() ?? null,
    });
    this.registerModSource('envelope', {
      scope: 'perVoice',
      bipolar: false,
      resolve: (ref, voice) =>
        voice.getModSourceNode(ref.index === 0 ? 'env1' : 'env2'),
    });
    this.registerModSource('velocity', {
      scope: 'perVoice',
      bipolar: false,
      resolve: (_ref, voice) => voice.getModSourceNode('velocity'),
    });
    this.registerModSource('keytrack', {
      scope: 'perVoice',
      bipolar: false,
      resolve: (_ref, voice) => voice.getModSourceNode('keytrack'),
    });
    this.registerModSource('modwheel', {
      scope: 'global',
      bipolar: false,
      resolve: () => this.modWheelNode,
    });
    this.registerModSource('macro', {
      scope: 'global',
      bipolar: false,
      resolve: (ref) => this.macroNodes[ref.index] ?? null,
    });
    this.registerModSource('audio', {
      scope: 'global',
      bipolar: true,
      resolve: (ref) => this.audioModOscs[ref.index] ?? null,
    });
  }

  /** Extension seam: register a new modulation source type. */
  registerModSource(type: string, provider: ModSourceProvider): void {
    this.modSourceProviders.set(type, provider);
  }

  /** Extension seam: register an extra modulation destination. */
  registerModTarget(
    source: string,
    param: string,
    resolver: TargetResolver,
  ): void {
    this.modMatrix?.registerTarget(source, param, resolver);
  }

  /** Extension seam: register a per-voice route transform (WaveShaper curve). */
  registerModTransform(id: string, provider: TransformProvider): void {
    this.modMatrix?.registerTransform(id, provider);
  }

  // --- Macros ---

  setMacro(index: number, value: number, time?: number): void {
    const node = this.macroNodes[index];
    if (node && this.ctx) {
      smoothParam(node.offset, value, this.ctx, 0.01, time);
    }
  }

  /**
   * Lazily-created analyser tap on an LFO output — lets the UI read the
   * live LFO value for modulation-ring animation.
   */
  getLFOAnalyser(index: number): AnalyserNode | null {
    if (!this.ctx) return null;
    const lfo = this.lfos[index];
    if (!lfo) return null;
    let analyser = this.lfoAnalysers[index];
    if (!analyser) {
      analyser = this.ctx.createAnalyser();
      analyser.fftSize = 32;
      lfo.getOutputNode().connect(analyser);
      this.lfoAnalysers[index] = analyser;
    }
    return analyser;
  }

  setRouting(config: RoutingConfig): void {
    this.voiceSeed.routing = config;
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setRouting(config);
    });
  }

  /** Pitch-bend wheel (-1..1) at `time` (now when omitted). */
  setPitchBend(value: number, time?: number): void {
    this.currentPitchBend = value;
    const cents = value * this.pitchBendRange;
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setPitchBendCents(cents, time);
    });
  }

  setPitchBendRange(semitones: number): void {
    this.pitchBendRange = semitones * 100; // semitones → cents
    // Re-apply current bend with new range
    this.setPitchBend(this.currentPitchBend);
  }

  // --- FX ---

  setDriveParams(params: Partial<DriveParams>): void {
    this.fxChain?.setDriveParams(params);
  }

  setChorusParams(params: Partial<ChorusParams>): void {
    this.fxChain?.setChorusParams(params);
  }

  setPhaserParams(params: Partial<PhaserParams>): void {
    this.fxChain?.setPhaserParams(params);
  }

  setDelayParams(params: Partial<DelayParams>): void {
    this.fxChain?.setDelayParams(params);
  }

  setReverbParams(params: Partial<ReverbParams>): void {
    this.fxChain?.setReverbParams(params);
  }

  setCompressorParams(params: Partial<CompressorParams>): void {
    this.fxChain?.setCompressorParams(params);
  }

  setModWheel(value: number, time?: number): void {
    if (this.vibratoDepth && this.ctx) {
      smoothParam(
        this.vibratoDepth.gain,
        value * SynthEngine.VIBRATO_MAX_DEPTH,
        this.ctx,
        0.01,
        time,
      );
    }
    // Mirror into the matrix mod-wheel source
    if (this.modWheelNode && this.ctx) {
      smoothParam(this.modWheelNode.offset, value, this.ctx, 0.01, time);
    }
  }

  /**
   * Public CC entry point (values normalized 0..1). Used by hardware MIDI
   * and by the DAW adapter for sequenced CC automation — pass the scheduled
   * `time` so automation lands with the notes, not a lookahead early.
   * Map: CC1 mod wheel · CC7 volume · CC20–27 macros 1–8.
   */
  handleCC(cc: number, value: number, time?: number): void {
    switch (cc) {
      case 1: // Mod wheel
        this.setModWheel(value, time);
        break;
      case 7: // Volume
        this.setMasterVolume(value, time);
        break;
      default:
        if (cc >= 20 && cc < 20 + MACRO_COUNT) {
          this.setMacro(cc - 20, value, time);
        }
        break;
    }
  }

  private handleMidiCC(cc: number, value: number): void {
    this.handleCC(cc, value);
  }

  // --- For visualizers and external access ---

  getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  getOscAnalyser(index: 0 | 1): AnalyserNode | null {
    return index === 0 ? this.osc1Analyser : this.osc2Analyser;
  }

  getNoiseAnalyser(): AnalyserNode | null {
    return this.noiseAnalyser;
  }

  /**
   * The always-alive visualization filter for the response display.
   * Kept in sync with the store by setFilterParams; unlike voice filters
   * (created lazily on first note) it exists from init, so the visualizer
   * can draw before any note plays. Shows the BASE response — per-voice
   * modulation (LFO on cutoff) is not reflected.
   */
  getFilter(index: 0 | 1): Filter | null {
    return this.vizFilters?.[index] ?? null;
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  getWavetableBank(): WavetableBank | null {
    return this.wavetableBank;
  }

  /**
   * Ensures imported (pack) wavetables are fetched and built, then swaps
   * any sounding oscillators off the basic-waveform fallback. Safe to call
   * with unknown names (they stay on the fallback) — fire-and-forget from
   * preset load.
   */
  async ensureWavetables(names: string[]): Promise<void> {
    const wanted = names.filter((n) => n && !this.wavetableBank?.hasTable(n));
    if (wanted.length === 0) return;
    await ensureFramesLoaded(wanted);
    this.voiceManager?.updateAllVoices((voice) => voice.refreshWavetables());
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
