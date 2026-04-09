import type { WorkletSynthesizer } from 'spessasynth_lib';
import type { OscillatorEntry } from './types';

/**
 * Audio engine for Major Arcanum.
 * Melody tones use SpessaSynth (GM soundfont) with an oscillator fallback.
 * Metronome clicks and drum sounds are synthesized via Web Audio.
 * Supports per-category volume controls (melody, drums, metronome).
 */
export class AudioEngine {
  ctx: AudioContext;
  masterGain: GainNode;
  melodyGain: GainNode;
  drumGain: GainNode;
  metronomeGain: GainNode;

  // Oscillator fallback for when soundfont isn't ready
  activeOscillators: Map<number, OscillatorEntry>;
  private noiseBuffer: AudioBuffer | null = null;

  // SpessaSynth soundfont
  private synth: WorkletSynthesizer | null = null;
  private synthReady = false;
  private activeNotes = new Set<number>();

  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 1.0;
    this.melodyGain.connect(this.masterGain);

    this.drumGain = this.ctx.createGain();
    this.drumGain.gain.value = 1.0;
    this.drumGain.connect(this.masterGain);

    this.metronomeGain = this.ctx.createGain();
    this.metronomeGain.gain.value = 1.0;
    this.metronomeGain.connect(this.masterGain);

    this.activeOscillators = new Map();
    this.createNoiseBuffer();
    this.initSoundFont();
  }

  private createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private async initSoundFont() {
    try {
      await this.ctx.audioWorklet.addModule(
        '/daw-assets/spessasynth_processor.min.js',
      );
      const { WorkletSynthesizer } = await import('spessasynth_lib');
      this.synth = new WorkletSynthesizer(this.ctx);
      await (this.synth as any).isReady;

      const sfResponse = await fetch('/daw-assets/GeneralUser_GS.sf2');
      if (!sfResponse.ok)
        throw new Error(`SF2 fetch failed: ${sfResponse.status}`);
      const sfData = await sfResponse.arrayBuffer();
      await (this.synth as any).soundBankManager.addSoundBank(sfData, 'gm');

      // Route through melodyGain for volume control
      this.synth.connect(this.melodyGain);

      // Default: Acoustic Grand Piano on channel 0
      this.synth.programChange(0, 0);

      this.synthReady = true;
    } catch {
      // Soundfont failed to load — oscillator fallback will be used
      this.synthReady = false;
    }
  }

  setVolume(
    category: 'master' | 'melody' | 'drums' | 'metronome',
    value: number,
  ) {
    const clamped = Math.max(0, Math.min(1, value));
    switch (category) {
      case 'master':
        this.masterGain.gain.value = clamped * 0.4;
        break;
      case 'melody':
        this.melodyGain.gain.value = clamped;
        break;
      case 'drums':
        this.drumGain.gain.value = clamped;
        break;
      case 'metronome':
        this.metronomeGain.gain.value = clamped;
        break;
    }
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  suspend() {
    if (this.ctx.state === 'running') this.ctx.suspend();
  }

  close() {
    if (this.synth) {
      this.synth.controllerChange(0, 123, 0); // all notes off
      this.synth.disconnect();
    }
    this.activeOscillators.forEach((_, midi) => this.stopTone(midi));
    this.activeNotes.clear();
    this.ctx.close();
  }

  startTone(midi: number) {
    if (this.synth && this.synthReady) {
      this.stopTone(midi);
      this.synth.noteOn(0, midi, 100);
      this.activeNotes.add(midi);
      return;
    }

    // Oscillator fallback
    this.stopTone(midi);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc2.detune.value = 5;

    const gain = this.ctx.createGain();
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = 0.3;

    osc.connect(gain);
    osc2.connect(mixGain);
    mixGain.connect(gain);
    gain.connect(this.melodyGain);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.4, this.ctx.currentTime + 0.2);

    osc.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);

    this.activeOscillators.set(midi, { osc, osc2, gain });
  }

  stopTone(midi: number) {
    // SpessaSynth path
    if (this.activeNotes.has(midi) && this.synth && this.synthReady) {
      this.synth.noteOff(0, midi);
      this.activeNotes.delete(midi);
      return;
    }

    // Oscillator fallback path
    const active = this.activeOscillators.get(midi);
    if (active) {
      const release = 0.15;
      active.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      active.gain.gain.setValueAtTime(
        active.gain.gain.value,
        this.ctx.currentTime,
      );
      active.gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + release,
      );
      active.osc.stop(this.ctx.currentTime + release);
      active.osc2.stop(this.ctx.currentTime + release);
      this.activeOscillators.delete(midi);
    }
  }

  playClick(time: number, isDownbeat: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.metronomeGain);
    osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, time);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  playDrum(type: 'kick' | 'snare' | 'hat', time: number) {
    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.drumGain);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time);
      osc.stop(time + 0.5);
    } else if (type === 'snare') {
      if (this.noiseBuffer) {
        const node = this.ctx.createBufferSource();
        node.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        const gain = this.ctx.createGain();
        node.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        node.start(time);
        node.stop(time + 0.2);
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.drumGain);
      osc.frequency.setValueAtTime(200, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.start(time);
      osc.stop(time + 0.1);
    } else if (type === 'hat') {
      if (this.noiseBuffer) {
        const node = this.ctx.createBufferSource();
        node.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        const gain = this.ctx.createGain();
        node.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        node.start(time);
        node.stop(time + 0.05);
      }
    }
  }
}
