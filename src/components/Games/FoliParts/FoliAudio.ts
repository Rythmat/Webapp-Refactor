// ── Foli's sound ────────────────────────────────────────────────────────────
// The drums are the owner's uploaded one-shots (curriculum/engine/foli/
// drums.ts), the clicks the shared metronome's, the groove a shaker loop.
// Everything is played at an audio-clock time the game gives it, so the
// call, the clicks and the grid the player is graded on are one clock.
//
// The shaker loops are recorded at 90 BPM: a faster level speeds one up, up
// to 120 BPM; past that the clicks alone keep time (a loop sped further
// stops sounding like a shaker).

import { audioEngine } from '@/audio/AudioEngine';
import { DRUMS, type FoliDrum } from '@/curriculum/engine/foli/drums';

const SHAKER_URLS = [
  '/samples/bongo/shaker1.wav',
  '/samples/bongo/shaker2.wav',
  '/samples/bongo/shaker3.wav',
];
const SHAKER_BPM = 90;
const SHAKER_MAX_BPM = 120;
const SHAKER_LEVEL = 0.4;

export class FoliAudio {
  private out: GainNode | null = null;
  private readonly buffers = new Map<FoliDrum, AudioBuffer>();
  /** Drum hits scheduled ahead: a pause or a stop cancels them. */
  private readonly pending = new Set<AudioBufferSourceNode>();
  private shakers: AudioBuffer[] = [];
  private shaker: { source: AudioBufferSourceNode; gain: GainNode } | null =
    null;
  private volume = 1;

  get ctx(): AudioContext {
    return audioEngine.context;
  }

  /** This game's channel on the shared mixer. */
  private attach(): GainNode {
    this.out ??= audioEngine.channel('games', this.volume);
    return this.out;
  }

  /**
   * Level for everything this game makes, the count-in clicks too: they play
   * on the shared metronome bus, so this drives that bus while Foli plays.
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.out?.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    audioEngine.metronome.setVolume(this.volume);
  }

  /** The drums a mode plays, the shaker loops and the clicks. */
  async load(drums: readonly FoliDrum[]) {
    this.attach();
    await Promise.all([
      ...drums.map(async (drum) => {
        if (!this.buffers.has(drum))
          this.buffers.set(
            drum,
            await audioEngine.samples.load(DRUMS[drum].url),
          );
      }),
      (async () => {
        if (!this.shakers.length)
          this.shakers = await Promise.all(
            SHAKER_URLS.map((url) => audioEngine.samples.load(url)),
          );
      })(),
      audioEngine.metronome.preload(),
    ]);
  }

  /** A drum, now or at an audio-clock time. */
  play(drum: FoliDrum, when = 0) {
    const buffer = this.buffers.get(drum);
    if (!buffer) return;
    const out = this.attach();
    audioEngine.resume();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    if (when > this.ctx.currentTime) this.pending.add(source);
    source.onended = () => {
      this.pending.delete(source);
      source.disconnect();
    };
    source.start(when);
  }

  /** Drop the drum hits scheduled ahead (a call cut short by a pause). */
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

  click(when: number, downbeat: boolean) {
    audioEngine.metronome.click(when, downbeat);
  }

  /** The shaker groove from a downbeat, at the level's tempo if it can. */
  startShaker(bpm: number, when: number) {
    this.stopShaker();
    if (bpm > SHAKER_MAX_BPM || !this.shakers.length) return;
    const out = this.attach();
    const gain = this.ctx.createGain();
    gain.gain.value = SHAKER_LEVEL;
    gain.connect(out);
    const source = this.ctx.createBufferSource();
    source.buffer =
      this.shakers[Math.floor(Math.random() * this.shakers.length)];
    source.loop = true;
    source.playbackRate.value = bpm / SHAKER_BPM;
    source.connect(gain);
    source.start(when);
    this.shaker = { source, gain };
  }

  stopShaker() {
    if (!this.shaker) return;
    const { source, gain } = this.shaker;
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    window.setTimeout(() => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      gain.disconnect();
    }, 120);
    this.shaker = null;
  }

  /** Release this game's channel. The context is shared — never close it. */
  close() {
    this.cancelScheduled();
    this.stopShaker();
    this.out?.disconnect();
    this.out = null;
  }
}
