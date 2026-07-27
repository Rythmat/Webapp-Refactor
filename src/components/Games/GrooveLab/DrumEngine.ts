import {
  createBus,
  getAudioContext,
  resumeAudio,
} from '@/audio/engine/AudioBus';

/**
 * Synthesized drum engine using Web Audio API.
 * Provides kick, snare, hi-hat, rim, and clap sounds.
 */
export class DrumEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private noiseBuffer: AudioBuffer;

  /** @param volume 0–1 master volume (see `setVolume`). */
  constructor(volume = 0.5) {
    // Shared context + this instance's own bus, rather than a context each.
    this.ctx = getAudioContext();
    this.masterGain = createBus(volume);
    this.noiseBuffer = this.createNoiseBuffer();
  }

  /** Set the 0–1 master volume, taking effect on the next drum hit. */
  setVolume(volume: number) {
    this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.01);
  }

  private createNoiseBuffer(): AudioBuffer {
    const size = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  resume() {
    resumeAudio();
  }

  /** Release this engine's bus. The context is shared — never close it. */
  close() {
    this.masterGain.disconnect();
  }

  get currentTime() {
    return this.ctx.currentTime;
  }

  playKick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  playSnare(time: number) {
    // Noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = this.ctx.createGain();
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.start(time);
    noise.stop(time + 0.2);

    // Body
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(200, time);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playHiHat(time: number) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    const gain = this.ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  playRim(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, time);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  playSound(instrument: string, time: number) {
    switch (instrument) {
      case 'kick':
        this.playKick(time);
        break;
      case 'snare':
        this.playSnare(time);
        break;
      case 'hihat':
        this.playHiHat(time);
        break;
      case 'rim':
        this.playRim(time);
        break;
    }
  }
}
