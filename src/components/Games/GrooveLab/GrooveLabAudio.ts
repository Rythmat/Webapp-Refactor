// ── Groove Lab's sound ──────────────────────────────────────────────────────
// Each groove on the kit it was designed on (the console's Drum Grooves
// designer: Natural, 808, House or a custom kit), the same one-shot samples
// the Studio's drum machine plays, on the arcade's channel of the shared
// mixer. Every hit is played at an audio-clock time the game gives it, so
// the groove and the grid the player is graded on are one clock (Foli's
// way: FoliParts/FoliAudio.ts). The shared metronome clicks only while a
// take records on the pads (Peter, 2026-10-21); otherwise the groove keeps
// the time.
//
// The old synthesized engine (DrumEngine.ts) stays: Jam Room plays it.

import { audioEngine } from '@/audio/AudioEngine';
import {
  DRUM_KIT_CONFIGS,
  padSampleUrl,
  type DrumKitConfig,
} from '@/daw/instruments/drumKits';

const FALLBACK_KIT = 'natural';

const kitConfig = (kit: string): DrumKitConfig =>
  DRUM_KIT_CONFIGS.find((c) => c.id === kit) ??
  DRUM_KIT_CONFIGS.find((c) => c.id === FALLBACK_KIT)!;

/** Where a pad's sample is, on a kit, falling back to Natural's. */
export function sampleUrl(kit: string, note: number): string {
  const config = kitConfig(kit);
  if (config.urls?.[note] || config.samples[note])
    return padSampleUrl(config, note);
  return padSampleUrl(kitConfig(FALLBACK_KIT), note);
}

/** A hit's loudness from its velocity: soft notes soft, never silent. */
const gainOf = (velocity: number) =>
  0.2 + 0.8 * Math.max(0, Math.min(1, velocity / 127));

export class GrooveLabAudio {
  private out: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  /** Hits scheduled ahead: a stop or a pause cancels them. */
  private readonly pending = new Set<AudioBufferSourceNode>();
  private volume = 1;

  get ctx(): AudioContext {
    return audioEngine.context;
  }

  private attach(): GainNode {
    this.out ??= audioEngine.channel('games', this.volume);
    return this.out;
  }

  /** Level for everything this game makes, a take's clicks too. */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.out?.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    audioEngine.metronome.setVolume(this.volume);
  }

  /** The samples a kit's pads need, and the clicks. */
  async load(kit: string, notes: readonly number[]) {
    this.attach();
    await Promise.all([
      ...notes.map(async (note) => {
        const url = sampleUrl(kit, note);
        if (!this.buffers.has(url))
          this.buffers.set(url, await audioEngine.samples.load(url));
      }),
      audioEngine.metronome.preload(),
    ]);
  }

  /**
   * Ready the metronome for a take: at this game's level. It's the app's one
   * metronome, and another game may have left it turned down (Major Arcanum
   * restores its own saved metronome slider whenever it opens).
   */
  readyClicks() {
    audioEngine.resume();
    audioEngine.metronome.setVolume(this.volume);
  }

  /** A metronome click at an audio-clock time. */
  click(when: number, downbeat: boolean) {
    audioEngine.metronome.click(when, downbeat);
  }

  /** A pad, now or at an audio-clock time. */
  play(kit: string, note: number, velocity = 100, when = 0) {
    const buffer = this.buffers.get(sampleUrl(kit, note));
    if (!buffer) return;
    const out = this.attach();
    audioEngine.resume();
    const gain = this.ctx.createGain();
    gain.gain.value = gainOf(velocity);
    gain.connect(out);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    if (when > this.ctx.currentTime) this.pending.add(source);
    source.onended = () => {
      this.pending.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(when);
  }

  /** Drop everything scheduled ahead. */
  cancelScheduled() {
    for (const source of this.pending) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.pending.clear();
  }

  /** Release this game's channel. The context is shared: never close it. */
  close() {
    this.cancelScheduled();
    this.out?.disconnect();
    this.out = null;
  }
}
