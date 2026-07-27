import {
  createBus,
  getAudioContext,
  resumeAudio,
} from '@/audio/engine/AudioBus';
import { metronome } from '@/audio/transport/Metronome';
import {
  getLocalChannel,
  initJamSynth,
  jamControllerChange,
  jamNoteOff,
  jamNoteOn,
  jamProgramChange,
} from '@/components/JamRoom/jamSoundFont';
import type { OscillatorEntry } from './types';

const CC_CHANNEL_VOLUME = 7; // MIDI CC7
const GRAND_PIANO_PROGRAM = 0; // GM program: "Acoustic Grand Piano"

// Melody used to run synth → melodyGain(1.0) → masterGain(0.4) → speakers. It
// now runs through the shared synth's own bus, so that 0.4 is folded into the
// channel volume instead to keep melody at the same level against the drums.
const MELODY_LEVEL_SCALAR = 0.4;

/**
 * Audio engine for Major Arcanum.
 *
 * Melody tones play through the *shared* SpessaSynth (see JamRoom/jamSoundFont)
 * on this game's MIDI channel, parameterized by program + channel volume — it
 * used to construct a second synth and fetch its own copy of the 31 MB GM
 * soundfont, so playing two games downloaded and parsed it twice. The
 * oscillator fallback still covers the window before the soundfont is ready.
 *
 * Metronome clicks and drum sounds stay synthesized here, on this game's own
 * buses off the shared master. Supports per-category volume controls (melody,
 * drums, metronome).
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

  // Shared SpessaSynth soundfont, addressed by channel
  private readonly channel = getLocalChannel();
  private synthReady = false;
  private activeNotes = new Set<number>();
  // Mixer positions (0–1), combined into this channel's MIDI volume.
  private masterVolume = 1;
  private melodyVolume = 1;

  constructor() {
    // Shared context + this game's own buses, rather than a context per game.
    this.ctx = getAudioContext();
    this.masterGain = createBus(0.4);

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
      // Shared load: whichever game got here first paid for the soundfont.
      await initJamSynth();
      jamProgramChange(this.channel, GRAND_PIANO_PROGRAM);
      this.synthReady = true;
      this.applyMelodyVolume();
    } catch {
      // Soundfont failed to load — oscillator fallback will be used
      this.synthReady = false;
    }
  }

  /** Push the melody mixer position at the shared synth as MIDI channel volume. */
  private applyMelodyVolume() {
    if (!this.synthReady) return;
    const level = this.masterVolume * this.melodyVolume * MELODY_LEVEL_SCALAR;
    jamControllerChange(
      this.channel,
      CC_CHANNEL_VOLUME,
      Math.round(Math.max(0, Math.min(1, level)) * 127),
    );
  }

  setVolume(
    category: 'master' | 'melody' | 'drums' | 'metronome',
    value: number,
  ) {
    const clamped = Math.max(0, Math.min(1, value));
    switch (category) {
      case 'master':
        this.masterVolume = clamped;
        this.masterGain.gain.value = clamped * 0.4;
        this.applyMelodyVolume();
        break;
      case 'melody':
        this.melodyVolume = clamped;
        // Also drives the oscillator fallback, which still runs through here.
        this.melodyGain.gain.value = clamped;
        this.applyMelodyVolume();
        break;
      case 'drums':
        this.drumGain.gain.value = clamped;
        break;
      case 'metronome':
        // The click now plays on the shared metronome bus, so this game's
        // slider drives that bus. Acceptable while Major Arcanum is the only
        // metronome running; it moves to a per-feature send if that changes.
        this.metronomeGain.gain.value = clamped;
        metronome.setVolume(clamped);
        break;
    }
  }

  resume() {
    resumeAudio();
  }

  /**
   * Release this game's nodes and silence its synth channel. The context and
   * the synth are shared — neither is closed here.
   */
  close() {
    if (this.synthReady) {
      for (const midi of this.activeNotes) jamNoteOff(this.channel, midi);
    }
    this.activeOscillators.forEach((_, midi) => this.stopTone(midi));
    this.activeNotes.clear();
    this.masterGain.disconnect();
  }

  startTone(midi: number) {
    if (this.synthReady) {
      this.stopTone(midi);
      jamNoteOn(this.channel, midi, 100);
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
    if (this.activeNotes.has(midi) && this.synthReady) {
      jamNoteOff(this.channel, midi);
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

  /**
   * The game schedules its own beat grid, so it asks the shared metronome for
   * the click sound at a precise time rather than handing over the timing.
   */
  playClick(time: number, isDownbeat: boolean) {
    metronome.click(time, isDownbeat);
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
