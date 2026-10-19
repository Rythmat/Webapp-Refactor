import { VoiceMode } from './types';
import { Voice } from './Voice';
import { WavetableBank } from './WavetableBank';
import { DEFAULT_VOICE_COUNT } from './constants';

interface HeldKey {
  note: number;
  velocity: number;
}

/**
 * Allocates voices for notes, on context time: every call takes the note's
 * scheduled time, and "free", "releasing" and "active" are judged at that time
 * (Voice.stateAt), not at the moment the call happens to run.
 *
 * Poly: free voice → new voice (under the limit) → steal the voice that
 * started releasing first → steal the oldest active voice. A stolen voice
 * fades out over a few ms on the `retired` list while the new note starts on
 * a clean voice in its slot; retired voices are reused once they are free.
 *
 * Mono and legato play one voice with a held-key stack: a new key while
 * another is held moves the pitch (gliding from the last played pitch);
 * MONO retriggers the envelopes from where they are, LEGATO keeps them
 * running. Releasing the sounding key returns to the last key still held.
 */
export class VoiceManager {
  private voices: Voice[] = [];
  private retired: Voice[] = [];
  private nextVoiceId = 0;
  private maxVoices: number;
  private voiceMode: VoiceMode = 'poly';
  private glideTime: number = 0;
  private spread: number = 0;
  private activeNotes: Map<number, Voice> = new Map();
  /** The last pitch played (a glide's starting point); -1 before any. */
  private lastNote = -1;
  private monoStack: HeldKey[] = [];
  private monoVoice: Voice | null = null;

  /** Invoked whenever a voice is lazily created — lets the engine attach
   *  vibrato, analysers, and modulation-matrix teardown to every voice. */
  onVoiceCreated: ((voice: Voice) => void) | null = null;

  /** Invoked when MONO/LEGATO moves the sounding voice to another key
   *  without a fresh note (note-dependent modulation needs rebuilding). */
  onPitchChange: ((voice: Voice) => void) | null = null;

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

  /**
   * Plays `note` at `time` (now when omitted). Returns the voice when a
   * fresh note started on it, or null when nothing new started (a mono or
   * legato pitch change on the sounding voice, or no voice available).
   */
  noteOn(note: number, velocity: number, time?: number): Voice | null {
    const t = time ?? this.ctx.currentTime;
    if (this.voiceMode === 'mono' || this.voiceMode === 'legato') {
      return this.monoNoteOn(note, velocity, t);
    }

    // If the note is already playing, its voice gives way to a clean one
    let voice: Voice | null;
    const existing = this.activeNotes.get(note);
    if (existing && !existing.isFree(t)) {
      this.activeNotes.delete(note);
      voice = this.steal(existing, t);
    } else {
      voice = this.allocateVoice(t);
    }
    if (!voice) return null;

    voice.noteOn(note, velocity, t, this.glideTime, this.glideOrigin());
    this.activeNotes.set(note, voice);
    this.lastNote = note;
    return voice;
  }

  noteOff(note: number, time?: number): void {
    const t = time ?? this.ctx.currentTime;
    if (this.monoStack.some((k) => k.note === note)) {
      this.monoNoteOff(note, t);
      return;
    }
    const voice = this.activeNotes.get(note);
    if (voice) {
      voice.noteOff(t);
      this.activeNotes.delete(note);
    }
  }

  /** Releases every held note at `time` (now when omitted). */
  allNotesOff(time?: number): void {
    const t = time ?? this.ctx.currentTime;
    for (const [, voice] of this.activeNotes) {
      voice.noteOff(t);
    }
    this.activeNotes.clear();
    this.monoStack = [];
    this.monoVoice?.noteOff(t);
  }

  /** Fades every sounding voice (held or releasing) out from `time`. */
  forceAllNotesOff(time?: number): void {
    const t = time ?? this.ctx.currentTime;
    for (const voice of [...this.voices, ...this.retired]) {
      voice.forceStop(t);
    }
    this.activeNotes.clear();
    this.monoStack = [];
  }

  private glideOrigin(): number | undefined {
    return this.glideTime > 0 && this.lastNote >= 0 ? this.lastNote : undefined;
  }

  private monoNoteOn(note: number, velocity: number, t: number): Voice | null {
    const keyHeld = this.monoStack.length > 0;
    this.monoStack = this.monoStack.filter((k) => k.note !== note);
    this.monoStack.push({ note, velocity });

    const sounding = this.monoVoice;
    if (keyHeld && sounding && sounding.isActive(t)) {
      const from = sounding.currentNote;
      if (this.voiceMode === 'legato') {
        sounding.glideTo(note, t, this.glideTime, from);
      } else {
        sounding.retrigger(note, velocity, t, this.glideTime, from);
      }
      this.lastNote = note;
      this.onPitchChange?.(sounding);
      return null;
    }

    // A fresh note: a tail still ringing on the mono voice fades out.
    let voice: Voice | null;
    if (sounding && !sounding.isFree(t)) {
      voice = this.steal(sounding, t);
    } else {
      voice = sounding ?? this.allocateVoice(t);
    }
    if (!voice) return null;

    // MONO glides from the last played pitch; LEGATO only between
    // overlapping keys (handled above).
    const from = this.voiceMode === 'mono' ? this.glideOrigin() : undefined;
    voice.noteOn(note, velocity, t, this.glideTime, from);
    this.monoVoice = voice;
    this.lastNote = note;
    return voice;
  }

  private monoNoteOff(note: number, t: number): void {
    const index = this.monoStack.findIndex((k) => k.note === note);
    if (index < 0) return;
    const wasSounding = index === this.monoStack.length - 1;
    this.monoStack.splice(index, 1);
    const voice = this.monoVoice;
    if (!voice || !wasSounding) return;

    const top = this.monoStack[this.monoStack.length - 1];
    if (!top) {
      voice.noteOff(t);
      return;
    }
    if (!voice.isActive(t)) return;
    const from = voice.currentNote;
    if (this.voiceMode === 'legato') {
      voice.glideTo(top.note, t, this.glideTime, from);
    } else {
      voice.retrigger(top.note, top.velocity, t, this.glideTime, from);
    }
    this.lastNote = top.note;
    this.onPitchChange?.(voice);
  }

  private allocateVoice(t: number): Voice | null {
    const pool = this.voices.slice(0, this.maxVoices);

    // 1. A voice that is free at the note's time
    const free = pool.find((v) => v.isFree(t));
    if (free) return free;

    // 2. A new voice while under the limit (lazy allocation)
    if (this.voices.length < this.maxVoices) {
      const voice = this.cleanVoice(t);
      this.voices.push(voice);
      // Give the freshly-added voice its spread-pan slot, from the note's
      // time (an offline booking pass runs with the clock at 0).
      this.applySpread(t);
      return voice;
    }

    // 3. Steal the voice that started releasing first
    const releasing = pool
      .filter((v) => v.isReleasing(t))
      .sort((a, b) => a.releaseAt - b.releaseAt || a.noteOnAt - b.noteOnAt);
    if (releasing.length > 0) return this.steal(releasing[0], t);

    // 4. Steal the oldest active voice (pool is full, all voices busy)
    const active = pool
      .filter((v) => v.isActive(t))
      .sort((a, b) => a.noteOnAt - b.noteOnAt);
    if (active.length > 0) {
      const victim = active[0];
      for (const [note, v] of this.activeNotes) {
        if (v === victim) {
          this.activeNotes.delete(note);
          break;
        }
      }
      return this.steal(victim, t);
    }

    return null;
  }

  /**
   * Fades `victim` out from `t` on the retired list and puts a clean voice
   * in its slot, so the new note never shares nodes with the old one.
   */
  private steal(victim: Voice, t: number): Voice {
    victim.forceStop(t);
    const fresh = this.cleanVoice(t);
    const slot = this.voices.indexOf(victim);
    if (slot >= 0) {
      this.voices[slot] = fresh;
      fresh.setSpreadPan(this.spreadPanFor(slot), t);
    }
    this.retired.push(victim);
    if (this.monoVoice === victim) this.monoVoice = null;
    return fresh;
  }

  /** A retired voice that is free at `t`, or a newly created one. */
  private cleanVoice(t: number): Voice {
    const index = this.retired.findIndex((v) => v.isFree(t));
    if (index >= 0) return this.retired.splice(index, 1)[0];
    const voice = new Voice(
      this.ctx,
      this.nextVoiceId++,
      this.wavetableBank,
      this.destination,
    );
    this.onVoiceCreated?.(voice);
    return voice;
  }

  setVoiceMode(mode: VoiceMode): void {
    if (mode === this.voiceMode) return;
    // Held notes were started under the old mode's bookkeeping; release
    // them so none is left without a note-off.
    this.allNotesOff();
    this.monoVoice = null;
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

  private spreadPanFor(slot: number): number {
    const count = this.voices.length;
    if (count <= 1) return 0;
    const t = slot / (count - 1); // 0..1
    return (t - 0.5) * 2 * this.spread; // -spread..+spread
  }

  private applySpread(time?: number): void {
    for (let i = 0; i < this.voices.length; i++) {
      this.voices[i].setSpreadPan(this.spreadPanFor(i), time);
    }
  }

  /** Every voice, including stolen ones still fading (they get reused). */
  updateAllVoices(updater: (voice: Voice) => void): void {
    for (const voice of [...this.voices, ...this.retired]) {
      updater(voice);
    }
  }

  getActiveVoices(): Voice[] {
    return [...this.voices, ...this.retired].filter((v) => !v.isFree());
  }

  getVoice(index: number): Voice | null {
    return this.voices[index] ?? null;
  }
}
