import { VoiceMode } from './types';
import { Voice } from './Voice';
import { WavetableBank } from './WavetableBank';
import { DEFAULT_VOICE_COUNT } from './constants';

export class VoiceManager {
  private voices: Voice[] = [];
  private maxVoices: number;
  private voiceMode: VoiceMode = 'poly';
  private glideTime: number = 0;
  private spread: number = 0;
  private activeNotes: Map<number, Voice> = new Map();

  // Stored for lazy voice allocation
  private ctx: AudioContext;
  private wavetableBank: WavetableBank;
  private destination: AudioNode;

  constructor(
    ctx: AudioContext,
    wavetableBank: WavetableBank,
    destination: AudioNode,
    maxVoices?: number,
  ) {
    this.ctx = ctx;
    this.wavetableBank = wavetableBank;
    this.destination = destination;
    this.maxVoices = maxVoices ?? DEFAULT_VOICE_COUNT;
    // Voices are allocated lazily on first noteOn (no pre-allocation)
  }

  noteOn(note: number, velocity: number, time?: number): Voice | null {
    // In mono/legato mode, only one voice is active
    if (this.voiceMode === 'mono' || this.voiceMode === 'legato') {
      this.allNotesOff(time);
    }

    // If note is already playing, stop it first
    const existing = this.activeNotes.get(note);
    if (existing && existing.state !== 'free') {
      existing.forceStop();
      this.activeNotes.delete(note);
    }

    const voice = this.allocateVoice();
    if (!voice) return null;

    voice.noteOn(note, velocity, this.glideTime, time);
    this.activeNotes.set(note, voice);
    return voice;
  }

  noteOff(note: number, time?: number): void {
    const voice = this.activeNotes.get(note);
    if (voice) {
      voice.noteOff(time);
      this.activeNotes.delete(note);
    }
  }

  allNotesOff(time?: number): void {
    for (const [, voice] of this.activeNotes) {
      voice.noteOff(time);
    }
    this.activeNotes.clear();
  }

  forceAllNotesOff(): void {
    for (const [, voice] of this.activeNotes) {
      voice.forceStop();
    }
    this.activeNotes.clear();
  }

  private allocateVoice(): Voice | null {
    const pool = this.voices.slice(0, this.maxVoices);

    // 1. Find a free voice in existing pool
    let voice = pool.find((v) => v.isFree());
    if (voice) return voice;

    // 2. Steal oldest releasing voice
    const releasing = pool
      .filter((v) => v.isReleasing())
      .sort((a, b) => a.assignedAt - b.assignedAt);
    if (releasing.length > 0) {
      voice = releasing[0];
      voice.forceStop();
      return voice;
    }

    // 3. Create a new voice if pool isn't full yet (lazy allocation)
    if (this.voices.length < this.maxVoices) {
      voice = new Voice(
        this.ctx,
        this.voices.length,
        this.wavetableBank,
        this.destination,
      );
      this.voices.push(voice);
      return voice;
    }

    // 4. Steal oldest active voice (pool is full, all voices busy)
    const active = pool
      .filter((v) => v.isActive())
      .sort((a, b) => a.assignedAt - b.assignedAt);
    if (active.length > 0) {
      voice = active[0];
      for (const [note, v] of this.activeNotes) {
        if (v.id === voice.id) {
          this.activeNotes.delete(note);
          break;
        }
      }
      voice.forceStop();
      return voice;
    }

    return null;
  }

  setVoiceMode(mode: VoiceMode): void {
    this.voiceMode = mode;
  }

  setMaxVoices(count: number): void {
    this.maxVoices = count;
  }

  setGlideTime(seconds: number): void {
    this.glideTime = seconds;
  }

  setSpread(spread: number): void {
    this.spread = spread;
    this.applySpread();
  }

  private applySpread(): void {
    const count = this.voices.length;
    for (let i = 0; i < count; i++) {
      if (count === 1) {
        this.voices[i].setSpreadPan(0);
      } else {
        const t = i / (count - 1); // 0..1
        const pan = (t - 0.5) * 2 * this.spread; // -spread..+spread
        this.voices[i].setSpreadPan(pan);
      }
    }
  }

  updateAllVoices(updater: (voice: Voice) => void): void {
    for (const voice of this.voices) {
      updater(voice);
    }
  }

  getActiveVoices(): Voice[] {
    return this.voices.filter((v) => v.state !== 'free');
  }

  getVoice(index: number): Voice | null {
    return this.voices[index] ?? null;
  }
}
