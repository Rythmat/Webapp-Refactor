// ── Metronome ────────────────────────────────────────────────────────────────
// One metronome for the application, replacing six independent ones (Foli,
// Board Choice, Major Arcanum, the curriculum hook, Play Along's count-in, and
// the DAW's). Each had its own timing loop, its own click sound, and its own
// idea of what "beat 1" means.
//
// It is a Scheduler client, so it inherits drift-free timing, and it plays on
// the mixer's `metronome` bus, so clicks can be levelled without touching
// music. Two ways to use it:
//
//   metronome.start()                — it owns the beat
//   metronome.click(time, accent)    — a game owns the beat and asks for a click
//
// The second exists because rhythm games schedule their own grid and only want
// the sound; forcing them through `start()` would mean two clocks arguing.

import { audioContextOwner } from '../core/AudioContextOwner';
import { mixer } from '../core/Mixer';
import { sampleManager } from '../samples/SampleManager';
import { Scheduler, scheduler, type RepeatHandle } from './Scheduler';
import { transport } from './Transport';

const CLICK_URL = '/sound/metronomeClick.mp3';
const DOWNBEAT_URL = '/sound/firstMetronomeClick.mp3';

/** Synth-click shape, used before samples decode and as a permanent fallback. */
const SYNTH_ACCENT_HZ = 1200;
const SYNTH_BEAT_HZ = 800;
const SYNTH_DECAY_S = 0.03;

export interface MetronomeStartOptions {
  /** Tempo for this run. Defaults to the transport's current tempo. */
  bpm?: number;
  /** Beats per bar; beat 0 of each bar is accented. Defaults to transport. */
  beatsPerBar?: number;
  /** Context time to start on. Defaults to now. */
  startTime?: number;
}

type BeatListener = (beat: number, time: number) => void;

class Metronome {
  private handle: RepeatHandle | null = null;
  private output: GainNode | null = null;
  private volume = 1;
  private beatsPerBar = 4;
  private accentDownbeat = true;
  private listeners = new Set<BeatListener>();
  private unsubscribeTempo: (() => void) | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Decode the click samples so the first beat isn't a synth fallback. */
  async preload(): Promise<void> {
    await sampleManager.preload([CLICK_URL, DOWNBEAT_URL]);
  }

  isRunning(): boolean {
    return this.handle !== null;
  }

  start(opts: MetronomeStartOptions = {}): void {
    this.stop();
    void this.preload();
    audioContextOwner.resume();

    if (opts.bpm != null) transport.setTempo(opts.bpm);
    this.beatsPerBar = opts.beatsPerBar ?? transport.beatsPerBar;

    this.handle = scheduler.every(
      Scheduler.beatSeconds(transport.bpm),
      (time, index) => {
        const beat = index % this.beatsPerBar;
        this.click(time, this.accentDownbeat && beat === 0);
        for (const listener of this.listeners) {
          try {
            listener(beat, time);
          } catch (err) {
            console.error('[Metronome] beat listener failed', err);
          }
        }
      },
      { startTime: opts.startTime },
    );

    // Follow tempo changes without restarting, so a lesson can ramp tempo.
    this.unsubscribeTempo = transport.onTempoChange((bpm) => {
      this.handle?.setInterval(Scheduler.beatSeconds(bpm));
    });
  }

  stop(): void {
    this.handle?.cancel();
    this.handle = null;
    this.unsubscribeTempo?.();
    this.unsubscribeTempo = null;
  }

  // ── Sound ────────────────────────────────────────────────────────────────

  /**
   * Play one click, optionally at a precise context time. For features that
   * schedule their own grid and just want the shared click sound.
   */
  click(time?: number, accent = false): void {
    const ctx = audioContextOwner.get();
    audioContextOwner.resume();
    const when = time ?? ctx.currentTime;
    const buffer = sampleManager.peek(accent ? DOWNBEAT_URL : CLICK_URL);
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.bus());
      source.onended = () => source.disconnect();
      source.start(when);
      return;
    }
    // Samples not decoded yet — a synthesized click keeps the beat audible
    // rather than dropping it.
    void sampleManager.preload([CLICK_URL, DOWNBEAT_URL]);
    this.synthClick(when, accent);
  }

  private synthClick(when: number, accent: boolean): void {
    const ctx = audioContextOwner.get();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(
      accent ? SYNTH_ACCENT_HZ : SYNTH_BEAT_HZ,
      when,
    );
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(accent ? 0.6 : 0.45, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, when + SYNTH_DECAY_S);
    osc.connect(gain);
    gain.connect(this.bus());
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(when);
    osc.stop(when + SYNTH_DECAY_S);
  }

  private bus(): GainNode {
    if (!this.output) this.output = mixer.channel('metronome', this.volume);
    return this.output;
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  setTempo(bpm: number): void {
    transport.setTempo(bpm);
  }

  setBeatsPerBar(beats: number): void {
    this.beatsPerBar = Math.max(1, Math.round(beats));
    transport.setBeatsPerBar(this.beatsPerBar);
  }

  setAccentDownbeat(accent: boolean): void {
    this.accentDownbeat = accent;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    const out = this.output;
    if (out) {
      out.gain.setTargetAtTime(this.volume, out.context.currentTime, 0.01);
    }
  }

  /** Observe beats — for count-in UI, beat highlighting, scoring windows. */
  onBeat(listener: BeatListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const metronome = new Metronome();
export { Metronome };
