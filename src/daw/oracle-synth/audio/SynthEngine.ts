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

/**
 * Top-level audio engine facade.
 * Creates AudioContext (or accepts external one for DAW integration),
 * manages WavetableBank, VoiceManager, and all parameter routing.
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

    this.ctx = externalCtx ?? new AudioContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
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

    // Wavetable bank
    this.wavetableBank = new WavetableBank(this.ctx);

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

    // Arpeggiator (routes through rawNoteOn/rawNoteOff)
    this.arpeggiator = new Arpeggiator(
      (note, vel) => this.rawNoteOn(note, vel),
      (note) => this.rawNoteOff(note),
    );

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
    if (this.ctx && this.ctx.state !== 'closed') {
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
    if (this.arpParams?.enabled && this.arpeggiator) {
      this.arpeggiator.noteOn(note, velocity);
    } else {
      this.rawNoteOn(note, velocity, time);
    }
  }

  noteOff(note: number, time?: number): void {
    if (this.arpParams?.enabled && this.arpeggiator) {
      this.arpeggiator.noteOff(note);
    } else {
      this.rawNoteOff(note, time);
    }
  }

  allNotesOff(): void {
    this.arpeggiator?.allNotesOff();
    this.voiceManager?.allNotesOff();
    this.scaleQuantizer.clear();
  }

  forceAllNotesOff(): void {
    this.arpeggiator?.allNotesOff();
    this.voiceManager?.forceAllNotesOff();
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

  setArpParams(params: ArpParams): void {
    this.arpParams = params;
    this.arpeggiator?.setParams(params);
  }

  /** Live chord pitch classes from the DAW's music-intelligence bus. */
  setArpChordContext(chordPcs: number[] | null): void {
    this.arpeggiator?.setChordContext(chordPcs);
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
    this.modMatrix.setRoutes(routes.map(migrateModRoute));
    // Apply edits to already-sounding notes, not just the next note-on
    if (this.voiceManager) {
      this.modMatrix.reconnectActiveVoices(this.voiceManager.getActiveVoices());
    }
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

  setPitchBend(value: number): void {
    this.currentPitchBend = value;
    const cents = value * this.pitchBendRange;
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setPitchBendCents(cents);
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
