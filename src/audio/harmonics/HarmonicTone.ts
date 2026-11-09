// ── Harmonic tones ─────────────────────────────────────────────────────────
// The small synth behind the harmonics teaching tools: one voice at a time,
// at any frequency (a partial is rarely a piano key). Three sounds:
//
//   'sine'  — a held sine, until stop() (the Arcade's Harmonic Strings).
//   'chime' — a touched natural harmonic: nearly pure, a bell's attack and a
//             long ring that dies away by itself.
//   'pluck' — a pressed (stopped) note: a bright plucked string whose top
//             fades first, for hearing a stop beside the harmonic there.
//
// It owns no context and no route: the caller hands it the channel to play
// into (and how to wake the context), so each page keeps its own bus.

export type HarmonicTimbre = 'sine' | 'chime' | 'pluck';

export interface HarmonicToneOptions {
  /** Where the voices go; its context is the one they are made on. */
  output: GainNode;
  /** Lift the context's autoplay suspension (from a user gesture). */
  resume: () => void;
}

interface Voice {
  sources: OscillatorNode[];
  gain: GainNode;
}

/** The pluck's spectrum: a string plucked near its end, partials 1–16. */
const PLUCK_PARTIALS = 16;

export class HarmonicTone {
  private readonly ctx: BaseAudioContext;
  private readonly output: GainNode;
  private readonly wake: () => void;
  private voice: Voice | null = null;
  private pluckWave: PeriodicWave | null = null;

  constructor({ output, resume }: HarmonicToneOptions) {
    this.output = output;
    this.ctx = output.context;
    this.wake = resume;
  }

  resume(): void {
    this.wake();
  }

  /** The channel's level (0–1), eased to avoid a click. */
  setVolume(v: number): void {
    this.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  /** Sound `hz`, cutting off whatever was sounding. */
  play(hz: number, timbre: HarmonicTimbre = 'sine'): void {
    this.stop();
    this.wake();
    if (timbre === 'sine') this.voice = this.sine(hz);
    else if (timbre === 'chime') this.voice = this.chime(hz);
    else this.voice = this.pluck(hz);
  }

  /** Fade the sounding voice out. */
  stop(): void {
    const voice = this.voice;
    if (!voice) return;
    voice.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    setTimeout(() => {
      for (const source of voice.sources) {
        try {
          source.stop();
        } catch {
          /* ok */
        }
      }
    }, 60);
    this.voice = null;
  }

  /** Release the voices and the channel. The context is shared — never close it. */
  close(): void {
    this.stop();
    this.output.disconnect();
  }

  // ── The sounds ───────────────────────────────────────────────────────────

  private sine(hz: number): Voice {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start();
    return { sources: [osc], gain };
  }

  private chime(hz: number): Voice {
    const t = this.ctx.currentTime;
    const ring = 3.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    gain.connect(this.output);
    // The partial, and a whisper of the one above it: a real harmonic is
    // never a perfect sine.
    const sources = [
      [hz, 1],
      [hz * 2, 0.08],
    ].map(([frequency, level]) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const partGain = this.ctx.createGain();
      partGain.gain.value = level;
      osc.connect(partGain);
      partGain.connect(gain);
      osc.start(t);
      osc.stop(t + ring + 0.05);
      return osc;
    });
    return { sources, gain };
  }

  private pluck(hz: number): Voice {
    const t = this.ctx.currentTime;
    const ring = 2.4;
    this.pluckWave ??= this.makePluckWave();
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(this.pluckWave);
    osc.frequency.value = hz;
    // The top of the spectrum dies first, as on a string.
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.5;
    tone.frequency.setValueAtTime(Math.min(hz * 12, 12000), t);
    tone.frequency.exponentialRampToValueAtTime(
      Math.min(hz * 2, 12000),
      t + ring * 0.6,
    );
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    osc.connect(tone);
    tone.connect(gain);
    gain.connect(this.output);
    osc.start(t);
    osc.stop(t + ring + 0.05);
    return { sources: [osc], gain };
  }

  private makePluckWave(): PeriodicWave {
    const real = new Float32Array(PLUCK_PARTIALS + 1);
    const imag = new Float32Array(PLUCK_PARTIALS + 1);
    // Plucked at a seventh of the length: partial k at sin(kπ/7)/k, so the
    // 7th (and 14th) is missing, as a guitar pluck's notch.
    for (let k = 1; k <= PLUCK_PARTIALS; k++) {
      imag[k] = Math.abs(Math.sin((k * Math.PI) / 7)) / k;
    }
    return this.ctx.createPeriodicWave(real, imag);
  }
}
