import * as Tone from 'tone';
import type { InstrumentAdapter } from './InstrumentAdapter';
import { samplerResToQ, type SamplerPlaybackMode } from './samplerChops';

// ── ChopsSampler ────────────────────────────────────────────────────────

/**
 * One-shot "Chops" sampler: a single user-loaded sample pitch-shifted
 * chromatically across the keyboard by Tone.Sampler, keyed at its root note.
 *
 * Unlike SamplerInstrument (fixed CDN sample maps), the sample arrives at
 * runtime as a decoded AudioBuffer — from a file drop, the bundled demo, or
 * asset rehydration after a project load — so init() resolves immediately and
 * the instrument stays silent until setSample() lands. Same Tone.Gain bridge +
 * CC64 sustain behavior as SamplerInstrument.
 *
 * Signal chain: sampler → filter (Simpler-style low-pass, transparent when
 * off) → gain (sample Gain control) → bridge → track input.
 */
export class ChopsSampler implements InstrumentAdapter {
  private sampler: Tone.Sampler | null = null;
  private filter: Tone.Filter | null = null;
  private gainNode: Tone.Gain | null = null;
  private bridge: Tone.Gain | null = null;
  private mode: SamplerPlaybackMode = 'classic';
  private sustainActive = false;
  private sustainedNotes = new Set<string>();
  private attack = 0.005;
  private release = 0.25;
  // Signature of the applied sample (sampleId + rootNote + trim) so callers
  // can re-apply idempotently on every store sync.
  private appliedSignature: string | null = null;

  async init(_ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.bridge = new Tone.Gain(1);
    this.bridge.connect(outputNode);
    this.gainNode = new Tone.Gain(1);
    this.gainNode.connect(this.bridge);
    // Always in-chain; "off" = fully open + zero Q (audibly transparent),
    // which avoids rewiring races when toggling mid-note.
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 22050,
      Q: 0,
      rolloff: -24,
    });
    this.filter.connect(this.gainNode);
  }

  /**
   * Load (or replace) the one-shot. No-ops when `signature` matches the
   * currently applied sample, so the playback engine can call this on every
   * track sync without churn.
   */
  setSample(signature: string, buffer: AudioBuffer, rootNote: string): void {
    if (!this.filter) return;
    if (signature === this.appliedSignature) return;

    this.sampler?.releaseAll();
    this.sampler?.dispose();
    this.sampler = new Tone.Sampler({
      urls: { [rootNote]: new Tone.ToneAudioBuffer(buffer) },
      attack: this.attack,
      release: this.release,
    });
    this.sampler.connect(this.filter);
    this.appliedSignature = signature;
    this.sustainedNotes.clear();
  }

  /** Signature of the currently applied sample, or null when empty. */
  getAppliedSignature(): string | null {
    return this.appliedSignature;
  }

  hasSample(): boolean {
    return this.sampler !== null;
  }

  setEnvelope(attack: number, release: number): void {
    this.attack = attack;
    this.release = release;
    if (this.sampler) {
      this.sampler.attack = attack;
      this.sampler.release = release;
    }
  }

  /**
   * Classic = gated by note-off (release envelope applies); 1-Shot = every
   * hit plays to the sample end, note-off ignored — Simpler's 1-Shot
   * *Trigger* sub-mode. Deliberate divergence: Simpler's 1-Shot is strictly
   * monophonic; ours stays polyphonic so chord-of-chops playing works.
   */
  setMode(mode: SamplerPlaybackMode): void {
    this.mode = mode;
  }

  setGain(gain: number): void {
    if (this.gainNode) this.gainNode.gain.value = gain;
  }

  setFilter(on: boolean, frequencyHz: number, resPct: number): void {
    if (!this.filter) return;
    this.filter.frequency.value = on ? frequencyHz : 22050;
    this.filter.Q.value = on ? samplerResToQ(resPct) : 0;
  }

  noteOn(note: number, velocity: number, time?: number): void {
    if (!this.sampler || !this.sampler.loaded) return;
    const noteName = Tone.Frequency(note, 'midi').toNote();
    this.sampler.triggerAttack(noteName, time, velocity / 127);
  }

  noteOff(note: number, time?: number): void {
    if (!this.sampler) return;
    // 1-Shot: the sample always plays out; note-off is ignored.
    if (this.mode === 'one-shot') return;
    const noteName = Tone.Frequency(note, 'midi').toNote();
    if (this.sustainActive) {
      this.sustainedNotes.add(noteName);
      return;
    }
    this.sampler.triggerRelease(noteName, time);
  }

  cc(controller: number, value: number): void {
    if (controller !== 64) return;
    if (value >= 64) {
      this.sustainActive = true;
    } else {
      this.sustainActive = false;
      for (const noteName of this.sustainedNotes) {
        this.sampler?.triggerRelease(noteName);
      }
      this.sustainedNotes.clear();
    }
  }

  allNotesOff(): void {
    this.sustainActive = false;
    this.sustainedNotes.clear();
    this.sampler?.releaseAll();
  }

  panic(): void {
    this.allNotesOff();
  }

  dispose(): void {
    this.sampler?.dispose();
    this.filter?.dispose();
    this.gainNode?.dispose();
    this.bridge?.dispose();
    this.sampler = null;
    this.filter = null;
    this.gainNode = null;
    this.bridge = null;
    this.appliedSignature = null;
  }
}
