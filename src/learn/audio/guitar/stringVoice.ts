/**
 * stringVoice.ts — Six plucked strings, played into the Studio guitar amp.
 *
 * A NAM amp model is trained on a DI guitar, so the lesson's guitar has to
 * sound like one going in: this is a Karplus-Strong string per guitar string,
 * each playing one note at a time (a new note on a string cuts the old one,
 * as fretting it would), with a pick attack that gets louder and brighter the
 * harder it strikes.
 *
 * The strings run in an AudioWorklet. A Web Audio DelayNode inside a feedback
 * loop can't be shorter than one 128-sample render quantum, which caps a loop
 * near 375 Hz — below the top of the neck, E6 (1319 Hz). Tone.PluckSynth's
 * comb worklet has no such cap, but it rounds the loop to whole samples
 * (E6 lands ~30 cents flat) and damps only the pick, not the string. Here each
 * loop is tuned exactly (a first-order allpass takes up the fraction) and
 * loses its highs faster than its fundamental, like a real string.
 *
 * Times are on the context's clock, so notes land sample-accurately; the
 * worklet queues them and allOff() drops whatever hasn't started.
 */

import {
  GUITAR_STANDARD_TUNING,
  fretToMidi,
  positionsFor,
} from '@/lib/guitar/fretboard';
import type { FretPosition, GuitarStringNumber } from '@/lib/guitar/types';

const PROCESSOR_NAME = 'learn-guitar-strings';

/** E6, the top of the voice, is fret 24 on the high E string. */
const TOP_FRET = 24;

/** Gap between strings in a strum, low string first. */
const STRUM_STAGGER_MS = 12;

/** Extra cost, in frets, of cutting a string that is still ringing. */
const BUSY_STRING_COST = 3;

/**
 * Runs in the AudioWorkletGlobalScope (sampleRate, currentFrame,
 * registerProcessor), so it is plain JavaScript loaded from a Blob.
 */
const PROCESSOR_SOURCE = /* javascript */ `
const TUNING = [64, 59, 55, 50, 45, 40];
// Peak of one string at full velocity: a DI guitar's level, so a full
// six-string strum peaks a little under 1.
const LEVEL = 0.22;
// A string re-plucked (or everything stopped) dies this fast…
const CUT_SECONDS = 0.02;
// …and one damped at the end of its note this fast.
const DAMP_SECONDS = 0.12;
const SILENT = 1e-5;

function releaseCoefficient(seconds) {
  return Math.exp(-6.9 / (seconds * sampleRate));
}

class Line {
  constructor(size) {
    this.buf = new Float32Array(size);
    this.n = 2;
    this.w = 0;
    this.b0 = 0;
    this.a = 0;
    this.lp = 0;
    this.c = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.env = 0;
    this.rel = 1;
    this.peak = 0;
    this.count = 0;
    this.active = false;
  }

  release(seconds) {
    if (this.active) this.rel = Math.min(this.rel, releaseCoefficient(seconds));
  }

  render(out, from, to) {
    const buf = this.buf;
    const n = this.n;
    const b0 = this.b0;
    const a = this.a;
    const c = this.c;
    const rel = this.rel;
    let w = this.w;
    let lp = this.lp;
    let x1 = this.x1;
    let y1 = this.y1;
    let env = this.env;
    let peak = this.peak;
    let count = this.count;
    for (let i = from; i < to; i++) {
      const x = buf[w];
      // Loss filter: one pole, so the highs die faster than the fundamental.
      lp = b0 * x + a * lp;
      // Fractional delay: a first-order allpass tunes the loop exactly.
      const y = c * lp + x1 - c * y1;
      x1 = lp;
      y1 = y;
      buf[w] = y;
      if (++w === n) w = 0;
      out[i] += x * env;
      env *= rel;
      const level = x < 0 ? -x : x;
      if (level > peak) peak = level;
      if (++count === n) {
        if (peak * env < SILENT) {
          this.active = false;
          return;
        }
        peak = 0;
        count = 0;
      }
    }
    this.w = w;
    this.lp = lp;
    this.x1 = x1;
    this.y1 = y1;
    this.env = env;
    this.peak = peak;
    this.count = count;
  }
}

class GuitarStringsProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Room for a loop down to 30 Hz (the voice clamps at MIDI 24, 32.7 Hz).
    const size = Math.ceil(sampleRate / 30) + 8;
    this.pick = new Float32Array(size);
    // Two lines per string, so a cut note can fade while the next one starts.
    this.strings = TUNING.map(() => ({
      lines: [new Line(size), new Line(size)],
      cur: 0,
      strike: 0,
    }));
    this.queue = [];
    this.alive = true;
    this.port.onmessage = (event) => this.receive(event.data);
  }

  receive(msg) {
    if (msg.type === 'allOff') {
      this.queue.length = 0;
      for (const s of this.strings) {
        s.strike = 0;
        s.lines[0].release(CUT_SECONDS);
        s.lines[1].release(CUT_SECONDS);
      }
    } else if (msg.type === 'dispose') {
      this.alive = false;
    } else {
      const event = Object.assign({}, msg, {
        frame: Math.round(msg.time * sampleRate),
      });
      let i = this.queue.length;
      while (i > 0 && this.queue[i - 1].frame > event.frame) i--;
      this.queue.splice(i, 0, event);
    }
  }

  apply(event) {
    if (event.type === 'on') {
      const s = this.strings[event.string - 1];
      s.lines[s.cur].release(CUT_SECONDS);
      s.cur ^= 1;
      this.pluck(s.lines[s.cur], event.midi, event.string, event.velocity);
      s.strike = event.strike;
    } else {
      for (const s of this.strings) {
        if (s.strike === event.strike) {
          s.strike = 0;
          s.lines[s.cur].release(DAMP_SECONDS);
        }
      }
    }
  }

  pluck(line, midi, string, velocity) {
    const f0 = 440 * Math.pow(2, (Math.min(108, Math.max(24, midi)) - 69) / 12);
    const w0 = (2 * Math.PI * f0) / sampleRate;
    // Rings about 7 s on the low E, less up the neck; the highs (4 kHz, or
    // the 3rd harmonic of a high note) die in well under a second.
    const t60 = Math.min(7, Math.max(1.2, 7 * Math.pow(82.41 / f0, 0.6)));
    const t60High = Math.min(0.6, Math.max(0.2, 0.1 * t60));
    const wHigh =
      (2 * Math.PI * Math.min(Math.max(4000, 3 * f0), 0.45 * sampleRate)) /
      sampleRate;
    // Loop gain per trip at the fundamental, and (squared) the share of it
    // left at the high frequency; solve the one pole that fits both.
    const g = Math.pow(10, -3 / (f0 * t60));
    const r2 = Math.pow(10, (-6 / f0) * (1 / t60High - 1 / t60));
    const b = Math.max(
      1.0001,
      (Math.cos(w0) - r2 * Math.cos(wHigh)) / (1 - r2),
    );
    const a = b - Math.sqrt(b * b - 1);
    line.a = a;
    // Never above unity at DC, where the one pole peaks.
    line.b0 = Math.min(
      g * Math.sqrt(1 - 2 * a * Math.cos(w0) + a * a),
      0.9999 * (1 - a),
    );
    // One period = the delay line + the loss filter's delay + the allpass.
    const d =
      sampleRate / f0 -
      Math.atan2(a * Math.sin(w0), 1 - a * Math.cos(w0)) / w0;
    const n = Math.min(line.buf.length, Math.max(2, Math.floor(d - 0.5)));
    const frac = d - n;
    line.c = (1 - frac) / (1 + frac);

    // The pick. At the pickup, a plucked string's first period is a pulse:
    // one way for the stretch between bridge and pick, back the other way
    // for the rest. Its harmonics fall 6 dB an octave, as a DI guitar's do,
    // with a notch wherever the pick sits on a node. The pick is a fixed
    // distance from the bridge, so relatively further along a fretted string.
    const fret = Math.max(0, midi - TUNING[string - 1]);
    const m = Math.max(
      1,
      Math.round(n * Math.min(0.5, 0.13 * Math.pow(2, fret / 12))),
    );
    const pick = this.pick;
    for (let i = 0; i < n; i++) {
      pick[i] = (i < m ? 1 : -m / (n - m)) + 0.15 * (Math.random() * 2 - 1);
    }
    // A harder pick is sharper, so brighter: it rounds the pulse off at a
    // higher harmonic. Filtered round the period twice, so it wraps cleanly.
    const v = Math.max(0, Math.min(1, velocity));
    const corner = Math.min(
      0.4 * sampleRate,
      Math.max(150, f0 * (3 + 30 * v * v)),
    );
    const k = 1 - Math.exp((-2 * Math.PI * corner) / sampleRate);
    let smooth = 0;
    let mean = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        smooth += k * (pick[i] - smooth);
        if (pass === 1) {
          line.buf[i] = smooth;
          mean += smooth;
        }
      }
    }
    mean /= n;
    let peak = 0;
    for (let i = 0; i < n; i++) {
      line.buf[i] -= mean;
      peak = Math.max(peak, Math.abs(line.buf[i]));
    }
    const scale = peak > 0 ? (LEVEL * Math.pow(v, 1.3)) / peak : 0;
    for (let i = 0; i < n; i++) line.buf[i] *= scale;

    line.n = n;
    line.w = 0;
    line.lp = 0;
    line.x1 = 0;
    line.y1 = 0;
    line.env = 1;
    line.rel = 1;
    line.peak = 0;
    line.count = 0;
    line.active = true;
  }

  process(inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return this.alive;
    out.fill(0);
    let i = 0;
    while (i < out.length) {
      while (this.queue.length > 0 && this.queue[0].frame - currentFrame <= i) {
        this.apply(this.queue.shift());
      }
      const end =
        this.queue.length > 0
          ? Math.min(out.length, this.queue[0].frame - currentFrame)
          : out.length;
      for (const s of this.strings) {
        if (s.lines[0].active) s.lines[0].render(out, i, end);
        if (s.lines[1].active) s.lines[1].render(out, i, end);
      }
      i = end;
    }
    return this.alive;
  }
}

registerProcessor('${PROCESSOR_NAME}', GuitarStringsProcessor);
`;

type StringMessage =
  | {
      type: 'on';
      strike: number;
      string: GuitarStringNumber;
      midi: number;
      velocity: number;
      time: number;
    }
  | { type: 'off'; strike: number; time: number }
  | { type: 'allOff' }
  | { type: 'dispose' };

export interface StringNoteOptions {
  /** The string to play it on (the step's fretPosition); else the best one. */
  string?: GuitarStringNumber;
  /** Context time; omit to play now. */
  time?: number;
}

export interface StringVoice {
  /**
   * Pluck a note (velocity 0..1). Returns the strike, for noteOff; 0 when
   * the note or velocity isn't a number, and nothing plays.
   */
  noteOn(midi: number, velocity: number, opts?: StringNoteOptions): number;
  /**
   * Damp a note, at a context time or now. With `strike`, only if that strike
   * still owns its string — a later re-pluck is left ringing.
   */
  noteOff(midi: number, time?: number, strike?: number): void;
  /**
   * Strum low string to high, `staggerMs` apart, all damped together after
   * `durationSeconds`. Positions play where given; bare notes are voiced
   * across the strings.
   */
  strum(
    notes: readonly number[] | readonly FretPosition[],
    durationSeconds: number,
    velocity: number,
    time?: number,
    staggerMs?: number,
  ): void;
  /** Drop every queued note and cut every ringing string. */
  allOff(): void;
  dispose(): void;
}

/** What each string is playing, as far as the scheduled notes say. */
interface StringState {
  midi: number;
  strike: number;
  /** When it is damped: a scheduled noteOff, or Infinity while held. */
  until: number;
}

const modules = new WeakMap<BaseAudioContext, Promise<void>>();

function loadProcessor(context: AudioContext): Promise<void> {
  let loaded = modules.get(context);
  if (!loaded) {
    const url = URL.createObjectURL(
      new Blob([PROCESSOR_SOURCE], { type: 'text/javascript' }),
    );
    loaded = context.audioWorklet
      .addModule(url)
      .finally(() => URL.revokeObjectURL(url));
    // A failed load (e.g. no AudioWorklet off https) may be retried.
    loaded.catch(() => modules.delete(context));
    modules.set(context, loaded);
  }
  return loaded;
}

function fretOn(string: GuitarStringNumber, midi: number): number {
  return midi - GUITAR_STANDARD_TUNING[string];
}

function playable(string: GuitarStringNumber, midi: number): boolean {
  const fret = fretOn(string, midi);
  return fret >= 0 && fret <= TOP_FRET;
}

class GuitarStringVoice implements StringVoice {
  private strikes = 0;
  private readonly ringing = new Map<GuitarStringNumber, StringState>();
  /** The newest strike of each note, for a noteOff that names none. */
  private readonly newest = new Map<number, number>();
  /** Fret of the last fretted note: where the hand is. */
  private hand = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly node: AudioWorkletNode,
  ) {}

  noteOn(midi: number, velocity: number, opts: StringNoteOptions = {}): number {
    const at = this.timeOrNow(opts.time);
    const string =
      opts.string !== undefined && playable(opts.string, midi)
        ? opts.string
        : this.chooseString(midi, at);
    return this.start(midi, string, velocity, at);
  }

  noteOff(
    midi: number,
    time?: number,
    strike: number | undefined = this.newest.get(midi),
  ): void {
    if (!strike) return;
    const at = this.timeOrNow(time);
    this.ringing.forEach((state) => {
      if (state.strike === strike) state.until = Math.min(state.until, at);
    });
    if (this.newest.get(midi) === strike) this.newest.delete(midi);
    this.post({ type: 'off', strike, time: at });
  }

  strum(
    notes: readonly number[] | readonly FretPosition[],
    durationSeconds: number,
    velocity: number,
    time?: number,
    staggerMs = STRUM_STAGGER_MS,
  ): void {
    if (!(durationSeconds > 0) || notes.length === 0) return;
    const at = this.timeOrNow(time);
    const end = at + durationSeconds;
    const placed = isPositions(notes)
      ? [...notes]
          .sort((a, b) => b.string - a.string)
          .map((p) => ({ midi: fretToMidi(p), string: p.string }))
      : this.voiceChord(notes, at);
    placed.forEach(({ midi, string }, i) => {
      const onAt = at + (i * staggerMs) / 1000;
      const strike = this.start(midi, string, velocity, onAt);
      this.noteOff(midi, Math.max(onAt, end), strike);
    });
  }

  allOff(): void {
    this.ringing.clear();
    this.newest.clear();
    this.post({ type: 'allOff' });
  }

  dispose(): void {
    this.allOff();
    this.post({ type: 'dispose' });
    this.node.disconnect();
  }

  /**
   * Returns 0 (no strike) for a note that isn't a number, or a position off
   * the strings: in the worklet it would stall the queue or fill the amp,
   * and everything after it on the bus, with NaN.
   */
  private start(
    midi: number,
    string: GuitarStringNumber,
    velocity: number,
    at: number,
  ): number {
    if (!Number.isFinite(midi) || !Number.isFinite(velocity)) return 0;
    const strike = ++this.strikes;
    this.ringing.set(string, { midi, strike, until: Infinity });
    this.newest.set(midi, strike);
    const fret = fretOn(string, midi);
    if (fret > 0) this.hand = fret;
    this.post({
      type: 'on',
      strike,
      string,
      midi,
      velocity: Math.max(0, Math.min(1, velocity)),
      time: at,
    });
    return strike;
  }

  private timeOrNow(time: number | undefined): number {
    return time !== undefined && Number.isFinite(time)
      ? time
      : this.context.currentTime;
  }

  private ringsAt(string: GuitarStringNumber, at: number): boolean {
    const state = this.ringing.get(string);
    return state !== undefined && at < state.until;
  }

  /**
   * A string for a lone note: the one already ringing it (a re-pluck), else
   * the position nearest the hand, sparing strings that are still ringing.
   * Notes off the neck play on the nearest end string.
   */
  private chooseString(midi: number, at: number): GuitarStringNumber {
    const candidates = positionsFor(midi, TOP_FRET);
    if (candidates.length === 0) {
      return midi < GUITAR_STANDARD_TUNING[6] ? 6 : 1;
    }
    const repluck = candidates.find(
      (p) =>
        this.ringsAt(p.string, at) && this.ringing.get(p.string)?.midi === midi,
    );
    if (repluck) return repluck.string;
    let best = candidates[0];
    let bestCost = Infinity;
    for (const p of candidates) {
      const cost =
        Math.abs(p.fret - this.hand) +
        (this.ringsAt(p.string, at) ? BUSY_STRING_COST : 0);
      if (cost < bestCost) {
        best = p;
        bestCost = cost;
      }
    }
    return best.string;
  }

  /**
   * Put a chord's notes on separate strings, lowest note on the lowest
   * string, each as near the chord's first fretted note as it can be while
   * leaving a string free for every note above it.
   */
  private voiceChord(
    midis: readonly number[],
    at: number,
  ): { midi: number; string: GuitarStringNumber }[] {
    const sorted = [...midis].sort((a, b) => a - b);
    let below = 7; // strings numbered below this are still free
    let anchor = this.hand;
    let anchored = false;
    return sorted.map((midi, i) => {
      const above = sorted.length - 1 - i;
      const options = positionsFor(midi, TOP_FRET).filter(
        (p) => p.string < below && p.string > above,
      );
      if (options.length === 0) {
        return { midi, string: this.chooseString(midi, at) };
      }
      const pick = options.reduce((best, p) =>
        Math.abs(p.fret - anchor) < Math.abs(best.fret - anchor) ? p : best,
      );
      below = pick.string;
      if (!anchored && pick.fret > 0) {
        anchor = pick.fret;
        anchored = true;
      }
      return { midi, string: pick.string };
    });
  }

  private post(message: StringMessage): void {
    this.node.port.postMessage(message);
  }
}

function isPositions(
  notes: readonly number[] | readonly FretPosition[],
): notes is readonly FretPosition[] {
  return typeof notes[0] === 'object';
}

/**
 * Six strings on `context`, sounding into `destination` (the amp rig's
 * playback input). Needs AudioWorklet, so a secure context.
 */
export async function createStringVoice(
  context: AudioContext,
  destination: AudioNode,
): Promise<StringVoice> {
  await loadProcessor(context);
  const node = new AudioWorkletNode(context, PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  node.connect(destination);
  return new GuitarStringVoice(context, node);
}
