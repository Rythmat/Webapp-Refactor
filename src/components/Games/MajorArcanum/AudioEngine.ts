import type { OscillatorEntry } from './types';

/**
 * Web Audio synthesis engine for Major Arcanum.
 * Handles melodic tones (dual-oscillator with detune), metronome clicks,
 * and synthesized drum sounds (kick, snare, hi-hat).
 */
export class AudioEngine {
  ctx: AudioContext;
  masterGain: GainNode;
  activeOscillators: Map<number, OscillatorEntry>;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);
    this.activeOscillators = new Map();
    this.createNoiseBuffer();
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

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  close() {
    // Stop all active oscillators before closing
    this.activeOscillators.forEach((_, midi) => this.stopTone(midi));
    this.ctx.close();
  }

  startTone(midi: number) {
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
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.4, this.ctx.currentTime + 0.2);

    osc.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);

    // Bug fix #1: Store both oscillators so both can be stopped
    this.activeOscillators.set(midi, { osc, osc2, gain });
  }

  stopTone(midi: number) {
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
      // Bug fix #1: Stop both oscillators
      active.osc.stop(this.ctx.currentTime + release);
      active.osc2.stop(this.ctx.currentTime + release);
      this.activeOscillators.delete(midi);
    }
  }

  playClick(time: number, isDownbeat: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
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
      gain.connect(this.masterGain);
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
        gain.connect(this.masterGain);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        node.start(time);
        node.stop(time + 0.2);
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);
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
        gain.connect(this.masterGain);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        node.start(time);
        node.stop(time + 0.05);
      }
    }
  }
}
