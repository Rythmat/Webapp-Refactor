import {
  OscillatorParams,
  EnvelopeParams,
  VoiceMode,
  FilterParams,
  SubOscillatorParams,
  NoiseParams,
  LFONode,
  ModRoute,
  ChorusParams,
  DelayParams,
  PhaserParams,
  CompressorParams,
  DriveParams,
  RoutingConfig,
  ArpParams,
} from './types';
import { VoiceManager } from './VoiceManager';
import { Filter } from './Filter';
import { WavetableBank } from './WavetableBank';
import { LFO } from './LFO';
import { ModulationMatrix } from './ModulationMatrix';
import { MidiHandler } from './MidiHandler';
import { Arpeggiator } from './Arpeggiator';
import { FXChain } from './fx/FXChain';
import { DEFAULT_VOICE_COUNT, smoothParam } from './constants';

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
  private pitchBendRange: number = 200; // cents (2 semitones default)
  private currentPitchBend: number = 0; // -1..1
  private isInitialized = false;

  private static readonly VIBRATO_RATE = 5.5; // Hz
  private static readonly VIBRATO_MAX_DEPTH = 50; // cents (half semitone)

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

    // Modulation matrix
    this.modMatrix = new ModulationMatrix(this.ctx, this.lfos);

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
    this.midiHandler?.dispose();
    this.arpeggiator?.dispose();
    this.arpeggiator = null;
    if (this.voiceManager) {
      this.voiceManager.allNotesOff();
    }
    this.modMatrix?.disconnectAll();
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
    for (const lfo of this.lfos) {
      lfo.stop();
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.isInitialized = false;
    this.ctx = null;
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
  }

  forceAllNotesOff(): void {
    this.arpeggiator?.allNotesOff();
    this.voiceManager?.forceAllNotesOff();
  }

  private rawNoteOn(note: number, velocity: number, time?: number): void {
    const voice = this.voiceManager?.noteOn(note, velocity, time);
    if (voice && this.modMatrix) {
      this.modMatrix.connectVoice(voice);
    }
  }

  private rawNoteOff(note: number, time?: number): void {
    this.voiceManager?.noteOff(note, time);
  }

  // --- Parameter updates ---

  setOscillatorParams(index: 0 | 1, params: Partial<OscillatorParams>): void {
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setOscillatorParams(index, params);
    });
  }

  setSubOscillatorParams(params: Partial<SubOscillatorParams>): void {
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setSubOscillatorParams(params);
    });
  }

  setNoiseParams(params: Partial<NoiseParams>): void {
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setNoiseParams(params);
    });
  }

  setFilterParams(index: 0 | 1, params: Partial<FilterParams>): void {
    this.voiceManager?.updateAllVoices((voice) => {
      voice.setFilterParams(index, params);
    });
  }

  setEnvelopeParams(index: 0 | 1, params: Partial<EnvelopeParams>): void {
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

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      smoothParam(this.masterGain.gain, volume, this.ctx);
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
    this.modMatrix?.setRoutes(routes);
  }

  setRouting(config: RoutingConfig): void {
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

  setCompressorParams(params: Partial<CompressorParams>): void {
    this.fxChain?.setCompressorParams(params);
  }

  setModWheel(value: number): void {
    if (this.vibratoDepth && this.ctx) {
      smoothParam(
        this.vibratoDepth.gain,
        value * SynthEngine.VIBRATO_MAX_DEPTH,
        this.ctx,
      );
    }
  }

  private handleMidiCC(cc: number, value: number): void {
    switch (cc) {
      case 1: // Mod wheel
        this.setModWheel(value);
        break;
      case 7: // Volume
        this.setMasterVolume(value);
        break;
    }
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

  getFilter(index: 0 | 1): Filter | null {
    const voice = this.voiceManager?.getVoice(0);
    if (!voice) return null;
    return index === 0 ? voice.getFilter1() : voice.getFilter2();
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  getWavetableBank(): WavetableBank | null {
    return this.wavetableBank;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
