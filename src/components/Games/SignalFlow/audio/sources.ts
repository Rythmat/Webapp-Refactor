import type { StringVoice } from '@/learn/audio/guitar/stringVoice';
import { dbToGain } from '../rig/rigTypes';
import type { SourceOutputs } from './rigAudio';

// ── The band ───────────────────────────────────────────────────────────────
// One clock, one short loop in A minor, one part per source. Each part starts
// at about 0 dBFS RMS so a level in the rig's tables means what it says. Each
// sound loads only when a mission needs it.

export type BandPart =
  | 'vox'
  | 'guitar'
  | 'bass'
  | 'kick'
  | 'snare'
  | 'hat'
  | 'tom'
  | 'overhead'
  | 'keys';

const BPM = 96;
const STEP_SECONDS = 60 / BPM / 4;
const LOOP_STEPS = 32;
const LOOK_AHEAD_SECONDS = 0.14;
const TICK_MS = 30;

const VOX_URL = '/daw-assets/samples/chops/demo-vox-c4.wav';
const VOX_ROOT = 60;
const DRUM_URLS: Partial<Record<BandPart, string>> = {
  kick: 'kick',
  snare: 'snare',
  hat: 'hihat-closed',
  tom: 'tom-mid',
  overhead: 'ride',
};
// The notes of the bass line, from the CC0 library in public/samples/bass/.
const BASS_FILES: Readonly<Record<number, string>> = {
  29: 'F1',
  31: 'G1',
  33: 'A1',
  36: 'C2',
  40: 'E2',
};
const bassUrl = (file: string) => `/samples/bass/electric/${file}.mp3`;
const drumUrl = (file: string) =>
  `/daw-assets/samples/drums/natural/${file}.wav`;

// Calibration: what brings each part to about 0 dBFS RMS while it plays. Set
// by measuring through the rig's own meters in the browser.
const TRIM_DB: Readonly<Record<BandPart, number>> = {
  vox: 8,
  guitar: 23,
  bass: 16,
  kick: 14,
  snare: 15,
  hat: 40,
  tom: 18,
  overhead: 36,
  keys: 10,
};

type Pattern = readonly (readonly [
  step: number,
  note: number,
  length: number,
])[];

const VOX_PHRASE: Pattern = [
  [0, 64, 4],
  [4, 67, 2],
  [6, 69, 6],
  [14, 67, 2],
  [16, 65, 4],
  [20, 64, 2],
  [22, 62, 6],
  [28, 60, 3],
];
const GUITAR_RIFF: Pattern = [
  [0, 45, 2],
  [2, 52, 2],
  [4, 57, 2],
  [6, 60, 2],
  [8, 64, 3],
  [11, 60, 1],
  [12, 57, 2],
  [14, 52, 2],
  [16, 41, 2],
  [18, 48, 2],
  [20, 53, 2],
  [22, 57, 2],
  [24, 60, 3],
  [27, 57, 1],
  [28, 53, 2],
  [30, 48, 2],
];
const BASS_LINE: Pattern = [
  [0, 33, 3],
  [4, 33, 1],
  [6, 40, 2],
  [10, 33, 2],
  [12, 36, 2],
  [16, 29, 3],
  [20, 29, 1],
  [22, 36, 2],
  [26, 29, 2],
  [28, 31, 2],
];
const KEY_CHORDS: readonly (readonly [number, readonly number[], number])[] = [
  [0, [57, 60, 64, 67], 7],
  [8, [57, 60, 64, 69], 7],
  [16, [53, 57, 60, 64], 7],
  [24, [55, 59, 62, 65], 7],
];
const hits = (...steps: readonly number[]): readonly number[] => steps;
const DRUM_PATTERN: Partial<Record<BandPart, readonly number[]>> = {
  kick: hits(0, 6, 10, 16, 22, 26),
  snare: hits(4, 12, 20, 28),
  hat: Array.from({ length: 16 }, (_, i) => i * 2),
  tom: hits(29, 30, 31),
  overhead: hits(0, 4, 8, 12, 16, 20, 24, 28),
};

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Band implements SourceOutputs {
  private readonly outs = new Map<BandPart, GainNode>();
  private readonly buffers = new Map<BandPart, AudioBuffer>();
  private voice: StringVoice | null = null;
  private readonly bassNotes = new Map<number, AudioBuffer>();
  private readonly loading = new Map<BandPart, Promise<void>>();
  private readonly listeners = new Set<(midi: number) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStep = 0;
  private nextTime = 0;
  private disposed = false;
  private loopedKeys = true;
  /** Parts that wouldn't load. */
  readonly failed = new Set<BandPart>();

  constructor(private readonly ctx: AudioContext) {}

  output(name: string): AudioNode | null {
    const part = name as BandPart;
    let out = this.outs.get(part);
    if (!out) {
      out = this.ctx.createGain();
      out.gain.value = dbToGain(TRIM_DB[part] ?? 0);
      this.outs.set(part, out);
    }
    return out;
  }

  /** Loads what these parts need. Safe to call again. */
  load(parts: readonly BandPart[]): Promise<void> {
    return Promise.all(parts.map((part) => this.loadPart(part))).then(() => {});
  }

  private loadPart(part: BandPart): Promise<void> {
    let loading = this.loading.get(part);
    if (!loading) {
      loading = this.fetchPart(part).catch((error: unknown) => {
        console.warn(`[signal-flow] ${part} did not load`, error);
        this.failed.add(part);
      });
      this.loading.set(part, loading);
    }
    return loading;
  }

  private async fetchPart(part: BandPart): Promise<void> {
    this.output(part);
    if (part === 'keys') return;
    if (part === 'vox') {
      this.buffers.set(part, await this.decode(VOX_URL));
      return;
    }
    if (part === 'guitar') {
      const { createStringVoice } = await import(
        '@/learn/audio/guitar/stringVoice'
      );
      const voice = await createStringVoice(
        this.ctx,
        this.output('guitar') as AudioNode,
      );
      if (this.disposed) voice.dispose();
      else this.voice = voice;
      return;
    }
    if (part === 'bass') {
      await Promise.all(
        Object.entries(BASS_FILES).map(async ([midi, file]) => {
          this.bassNotes.set(Number(midi), await this.decode(bassUrl(file)));
        }),
      );
      return;
    }
    const file = DRUM_URLS[part];
    if (file) this.buffers.set(part, await this.decode(drumUrl(file)));
  }

  private async decode(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return this.ctx.decodeAudioData(await response.arrayBuffer());
  }

  // ── The clock ────────────────────────────────────────────────────────────

  get playing() {
    return this.timer !== null;
  }

  /** Whether the keys play the loop, or wait for the student's hands. */
  setLoopedKeys(looped: boolean) {
    this.loopedKeys = looped;
  }

  start() {
    if (this.timer || this.disposed) return;
    this.nextStep = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.voice?.allOff();
  }

  /** Called as each note goes out as data: what a MIDI cable is carrying. */
  onNote(listener: (midi: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** A key pressed by hand, played by the laptop's instrument, right now. */
  playKey(midi: number) {
    this.keyNote(midi, this.ctx.currentTime, 0.42, 0.6);
    for (const listener of this.listeners) listener(midi);
  }

  private tick() {
    const horizon = this.ctx.currentTime + LOOK_AHEAD_SECONDS;
    while (this.nextTime < horizon) {
      this.scheduleStep(this.nextStep, this.nextTime);
      this.nextStep = (this.nextStep + 1) % LOOP_STEPS;
      this.nextTime += STEP_SECONDS;
    }
  }

  private scheduleStep(step: number, time: number) {
    if (this.buffers.has('vox')) {
      for (const [at, note, length] of VOX_PHRASE) {
        if (at === step) this.voxNote(note, time, length * STEP_SECONDS);
      }
    }
    if (this.voice) {
      for (const [at, note, length] of GUITAR_RIFF) {
        if (at === step) {
          const strike = this.voice.noteOn(note, 0.8, { time });
          this.voice.noteOff(note, time + length * STEP_SECONDS * 0.95, strike);
        }
      }
    }
    for (const [at, note, length] of BASS_LINE) {
      if (at === step) this.bassNote(note, time, length * STEP_SECONDS);
    }
    for (const part of ['kick', 'snare', 'hat', 'tom', 'overhead'] as const) {
      if (DRUM_PATTERN[part]?.includes(step)) this.hit(part, time);
    }
    if (this.outs.has('keys') && this.loopedKeys) {
      for (const [at, notes, length] of KEY_CHORDS) {
        if (at !== step) continue;
        for (const note of notes) {
          this.keyNote(note, time, length * STEP_SECONDS, 0.26);
        }
        if (this.listeners.size) {
          const delay = Math.max(0, (time - this.ctx.currentTime) * 1000);
          setTimeout(() => {
            for (const note of notes) {
              for (const listener of this.listeners) listener(note);
            }
          }, delay);
        }
      }
    }
  }

  private voxNote(midi: number, time: number, length: number) {
    const buffer = this.buffers.get('vox');
    const out = this.outs.get('vox');
    if (!buffer || !out) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.pow(2, (midi - VOX_ROOT) / 12);
    source.loop = true;
    source.loopStart = 0.15;
    source.loopEnd = Math.min(0.75, buffer.duration);
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(1, time + 0.02);
    envelope.gain.setValueAtTime(1, time + length - 0.05);
    envelope.gain.linearRampToValueAtTime(0, time + length);
    source.connect(envelope);
    envelope.connect(out);
    source.start(time);
    source.stop(time + length + 0.01);
    source.onended = () => envelope.disconnect();
  }

  private bassNote(midi: number, time: number, length: number) {
    const buffer = this.bassNotes.get(midi);
    const out = this.outs.get('bass');
    if (!buffer || !out) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(1, time);
    envelope.gain.setValueAtTime(1, time + length);
    envelope.gain.linearRampToValueAtTime(0, time + length + 0.06);
    source.connect(envelope);
    envelope.connect(out);
    source.start(time);
    source.stop(time + length + 0.08);
    source.onended = () => envelope.disconnect();
  }

  private hit(part: BandPart, time: number) {
    const buffer = this.buffers.get(part);
    const out = this.outs.get(part);
    if (!buffer || !out) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start(time);
  }

  private keyNote(midi: number, time: number, length: number, level: number) {
    const out = this.outs.get('keys');
    if (!out) return;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + 0.006);
    envelope.gain.setTargetAtTime(level * 0.55, time + 0.01, 0.18);
    envelope.gain.setTargetAtTime(0, time + length, 0.08);
    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = midiToHz(midi);
    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = midiToHz(midi) * 2;
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.22;
    body.connect(envelope);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(envelope);
    envelope.connect(out);
    body.start(time);
    shimmer.start(time);
    const end = time + length + 0.5;
    body.stop(end);
    shimmer.stop(end);
    body.onended = () => {
      shimmerGain.disconnect();
      envelope.disconnect();
    };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.voice?.dispose();
    this.voice = null;
    for (const out of this.outs.values()) out.disconnect();
    this.outs.clear();
    this.listeners.clear();
  }
}
