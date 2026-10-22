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

/** The open hi-hat, and the hats that close it: closed, pedal, open again. */
const OPEN_HAT = 46;
const HATS = new Set([42, 44, OPEN_HAT]);
/** How fast a closed open hat dies away (time constant, s), and when it stops. */
const CHOKE_TAU_S = 0.008;
const CHOKE_STOP_S = 0.06;

/** An open hat's hit: rings until the next hat after it closes it. */
interface OpenHat {
  source: AudioBufferSourceNode;
  gain: GainNode;
  level: number;
  start: number;
  closedAt: number;
}

export class GrooveLabAudio {
  private out: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  /** Hits scheduled ahead: a stop or a pause cancels them. */
  private readonly pending = new Set<AudioBufferSourceNode>();
  /**
   * The open hats ringing or booked, and when the hats booked ahead play. A
   * hi-hat is one instrument: the next hat after an open one closes it, as
   * the Studio's drum machine does (Peter, 2026-10-22). Hits are booked a
   * pass ahead, lane by lane, so a hat can be booked before or after the
   * open one it closes.
   */
  private readonly openHats = new Set<OpenHat>();
  private hatTimes: number[] = [];
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
    const level = gainOf(velocity);
    gain.gain.value = level;
    gain.connect(out);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    if (when > this.ctx.currentTime) this.pending.add(source);
    const open: OpenHat | null =
      note === OPEN_HAT
        ? { source, gain, level, start: 0, closedAt: Infinity }
        : null;
    source.onended = () => {
      this.pending.delete(source);
      if (open) this.openHats.delete(open);
      source.disconnect();
      gain.disconnect();
    };
    source.start(when);

    // Started first: a source can't be stopped before it starts.
    const at = Math.max(when, this.ctx.currentTime);
    if (HATS.has(note)) this.hatAt(at);
    if (open) {
      open.start = at;
      this.openHats.add(open);
      // A hat booked already after it closes it.
      const next = this.hatTimes.find((t) => t > at);
      if (next !== undefined) this.closeHat(open, next);
    }
  }

  /** A hat at `at`: every open hat ringing (or booked) before it closes there. */
  private hatAt(at: number) {
    for (const open of this.openHats)
      if (open.start < at && at < open.closedAt) this.closeHat(open, at);
    const now = this.ctx.currentTime;
    this.hatTimes = [...this.hatTimes.filter((t) => t >= now), at].sort(
      (a, b) => a - b,
    );
  }

  /** An open hat dies away quickly from `at`, as a foot closing the hats. */
  private closeHat(open: OpenHat, at: number) {
    open.closedAt = at;
    const { gain } = open.gain;
    gain.cancelScheduledValues(0);
    gain.setValueAtTime(open.level, at);
    gain.setTargetAtTime(0, at, CHOKE_TAU_S);
    open.source.stop(at + CHOKE_STOP_S);
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
    // The hats booked ahead are gone with them.
    this.hatTimes = [];
  }

  /** Release this game's channel. The context is shared: never close it. */
  close() {
    this.cancelScheduled();
    this.out?.disconnect();
    this.out = null;
  }
}
