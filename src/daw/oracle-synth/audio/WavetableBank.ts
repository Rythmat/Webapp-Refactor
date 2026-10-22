import {
  frameToPartials,
  getCachedFrames,
  FRAME_SIZE,
} from './wavetableImport';
import { isPhaseWarp, warpFrames } from './wavetableWarp';
import type { OscWarpMode } from './types';

/**
 * Generates and stores wavetable data as PeriodicWave objects.
 * Each "wavetable" is an array of PeriodicWave frames.
 * WT POS morphs between adjacent frames.
 *
 * Beyond the built-in procedural tables, imported tables (wavetable packs)
 * are built lazily from the shared frame cache on first access — frames are
 * fetched once app-wide, PeriodicWaves are built once per AudioContext
 * (forContext: every synth track on it shares one bank).
 */
const banksByContext = new WeakMap<BaseAudioContext, WavetableBank>();

export class WavetableBank {
  /**
   * The context's bank, made on first use. Each synth track built its own,
   * with every built-in and pack table's waves again (audit 2026-10-21); an
   * export's offline context gets one of its own.
   */
  static forContext(ctx: AudioContext): WavetableBank {
    let bank = banksByContext.get(ctx);
    if (!bank) {
      bank = new WavetableBank(ctx);
      banksByContext.set(ctx, bank);
    }
    return bank;
  }

  private ctx: AudioContext;
  private tables: Map<string, PeriodicWave[]> = new Map();

  // Time-domain frame data kept for phase-warp pre-baking. Procedural tables
  // record their partials (cheap) and synthesize frames lazily on first warp;
  // imported tables reuse the shared frame cache. Never touched by the normal
  // (unwarped) read path, so it can't affect existing preset sound.
  private framePartials: Map<string, { real: number[]; imag: number[] }[]> =
    new Map();
  private frameStore: Map<string, Float32Array[]> = new Map();
  /** Tables whose frames each play at full scale (normalized one by one). */
  private perFrameTables = new Set<string>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.generateBasicTables();
  }

  /**
   * Builds an imported table from raw 2048-sample frames. Frames are
   * normalized by the table-global peak (per-frame normalization would
   * flatten intentional loudness differences across a morph), then
   * converted to PeriodicWaves with normalization disabled. `perFrame`
   * normalizes each frame on its own instead: a warped copy of a procedural
   * table, whose unwarped frames the browser normalizes one by one.
   *
   * The peak is taken without each frame's DC, which frameToPartials drops:
   * a DC-heavy frame measured with it played up to ~2× full scale (audit
   * 2026-10-21: Default Shapes frames 5-8 peaked at 1.94).
   */
  loadWavetableFromFrames(
    name: string,
    frames: Float32Array[],
    perFrame = false,
  ): void {
    if (frames.length === 0) return;
    // Keep the raw frames so a phase warp can be baked from them later.
    this.frameStore.set(
      name,
      frames.map((f) => Float32Array.from(f)),
    );
    if (perFrame) this.perFrameTables.add(name);
    const peakOf = (frame: Float32Array) => {
      let mean = 0;
      for (let i = 0; i < frame.length; i++) mean += frame[i];
      mean /= frame.length || 1;
      let peak = 0;
      for (let i = 0; i < frame.length; i++) {
        const a = Math.abs(frame[i] - mean);
        if (a > peak) peak = a;
      }
      return peak;
    };
    let tablePeak = 0;
    if (!perFrame) {
      for (const frame of frames)
        tablePeak = Math.max(tablePeak, peakOf(frame));
    }
    const waves: PeriodicWave[] = [];
    const scaled = new Float32Array(frames[0].length);
    for (const frame of frames) {
      const peak = perFrame ? peakOf(frame) : tablePeak;
      const scale = peak > 0 ? 1 / peak : 1;
      for (let i = 0; i < frame.length; i++) scaled[i] = frame[i] * scale;
      const { real, imag } = frameToPartials(scaled);
      waves.push(
        this.ctx.createPeriodicWave(real, imag, { disableNormalization: true }),
      );
    }
    this.tables.set(name, waves);
  }

  /**
   * Effective table name to read for a phase warp, building (and caching) the
   * warped variant lazily. Returns `baseName` unchanged for non-phase warps,
   * zero amount, or a base table with no obtainable time-domain frames.
   */
  resolveWarpedTable(
    baseName: string,
    mode: OscWarpMode,
    amount: number,
  ): string {
    if (!isPhaseWarp(mode) || amount <= 0.001) return baseName;
    const q = Math.round(Math.max(0, Math.min(1, amount)) * 20);
    const derived = `${baseName}::${mode}@${q}`;
    if (this.tables.has(derived)) return derived;
    const base = this.getTimeDomainFrames(baseName);
    if (!base || base.length === 0) return baseName;
    // A procedural table plays each frame browser-normalized: its warped
    // copy keeps that, rather than drop up to 28 dB (audit 2026-10-21).
    this.loadWavetableFromFrames(
      derived,
      warpFrames(base, mode, q / 20),
      this.framePartials.has(baseName),
    );
    return derived;
  }

  /**
   * A table's frames to draw (the dock's synth card plots them), unwarped:
   * time-domain, one per WT position step, or null when none are obtainable
   * yet (a pack table still loading). Never on the audio path.
   */
  getDisplayFrames(name: string): readonly Float32Array[] | null {
    return this.getTimeDomainFrames(name);
  }

  /**
   * How a table's frames play relative to each other: 'frame' when each is
   * brought to full scale (procedural tables, which the browser normalizes,
   * and their warped copies), 'table' when the table's own loudness
   * contour across its frames is kept (imported tables). A plot scales its
   * frames the same way, so it shows what plays.
   */
  getDisplayScaling(name: string): 'frame' | 'table' {
    return this.framePartials.has(name) || this.perFrameTables.has(name)
      ? 'frame'
      : 'table';
  }

  /** Time-domain frames for a table (imported cache, stored, or synthesized
   *  from procedural partials), or null when none are obtainable. */
  private getTimeDomainFrames(name: string): Float32Array[] | null {
    const stored = this.frameStore.get(name);
    if (stored) return stored;
    const cached = getCachedFrames(name);
    if (cached) {
      const copy = cached.map((f) => Float32Array.from(f));
      this.frameStore.set(name, copy);
      return copy;
    }
    const partials = this.framePartials.get(name);
    if (partials) {
      const frames = partials.map((p) => this.partialsToFrame(p));
      this.frameStore.set(name, frames);
      return frames;
    }
    return null;
  }

  /** Inverse of frameToPartials: synthesize a time-domain frame from a
   *  table's Fourier partials (used only when a phase warp is requested). */
  private partialsToFrame(p: { real: number[]; imag: number[] }): Float32Array {
    const frame = new Float32Array(FRAME_SIZE);
    const len = Math.min(p.real.length, p.imag.length);
    for (let k = 1; k < len; k++) {
      const a = p.real[k];
      const b = p.imag[k];
      if (a === 0 && b === 0) continue;
      const w = (2 * Math.PI * k) / FRAME_SIZE;
      for (let i = 0; i < FRAME_SIZE; i++) {
        frame[i] += a * Math.cos(w * i) + b * Math.sin(w * i);
      }
    }
    return frame;
  }

  /** Registers a procedural table: builds its PeriodicWaves (unchanged audio
   *  path) and records its partials for lazy phase-warp frame synthesis. */
  private registerProceduralTable(
    name: string,
    partialsList: { real: number[]; imag: number[] }[],
  ): void {
    this.framePartials.set(name, partialsList);
    this.tables.set(
      name,
      partialsList.map((p) => this.buildFromPartials(p)),
    );
  }

  hasTable(name: string): boolean {
    return this.tables.has(name) || getCachedFrames(name) !== null;
  }

  /** Built table, building lazily from the shared frame cache on miss. */
  private resolveTable(name: string): PeriodicWave[] | undefined {
    const existing = this.tables.get(name);
    if (existing) return existing;
    const frames = getCachedFrames(name);
    if (frames) {
      this.loadWavetableFromFrames(name, frames);
      return this.tables.get(name);
    }
    return undefined;
  }

  private generateBasicTables(): void {
    const N = 128; // number of harmonics

    // Single-frame analytic waves
    this.registerProceduralTable('SINE WAVE', [this.sinePartials(N)]);
    this.registerProceduralTable('SAWTOOTH', [this.sawPartials(N)]);
    this.registerProceduralTable('TRIANGLE', [this.trianglePartials(N)]);
    this.registerProceduralTable('SQUARE', [this.squarePartials(N)]);

    // PWM table: multiple frames with varying pulse width
    const pwmPartials: { real: number[]; imag: number[] }[] = [];
    for (let i = 0; i < 16; i++) {
      const dutyCycle = 0.1 + (i / 15) * 0.8; // 10% to 90%
      pwmPartials.push(this.pwmPartials(N, dutyCycle));
    }
    this.registerProceduralTable('PWM', pwmPartials);

    // Supersaw: multiple slightly different saw shapes for morphing
    const supersawPartials: { real: number[]; imag: number[] }[] = [];
    for (let i = 0; i < 8; i++) {
      const rolloff = 0.5 + (i / 7) * 1.5; // harmonic rolloff variation
      supersawPartials.push(this.sawPartialsRolloff(N, rolloff));
    }
    this.registerProceduralTable('SUPER SAW', supersawPartials);

    // Formant: 12 frames morphing through vowel-like formant shapes (A→E→I→O→U and blends)
    // Formant center frequencies (as harmonic numbers at ~130 Hz fundamental)
    // Each frame boosts 2-3 formant regions to create vowel-like timbres
    const vowelFormants = [
      [6, 10, 20], // A (open)
      [4, 17, 20], // A→E
      [3, 17, 20], // E
      [3, 13, 20], // E→I
      [2, 17, 24], // I
      [2, 10, 24], // I→O
      [3, 6, 20], // O
      [3, 8, 18], // O→U
      [2, 5, 18], // U
      [4, 8, 22], // U→A (back)
      [5, 10, 22], // blend
      [6, 10, 20], // A (loop point)
    ];
    this.registerProceduralTable(
      'FORMANT',
      vowelFormants.map((formants) => this.formantPartials(N, formants)),
    );

    // Harmonic Series: 16 frames from pure fundamental to full harmonics
    const harmonicPartials: { real: number[]; imag: number[] }[] = [];
    for (let i = 0; i < 16; i++) {
      const harmonicCount = 1 + Math.round((i / 15) * (N - 2)); // 1 to N-1 harmonics
      harmonicPartials.push(this.harmonicSeriesPartials(N, harmonicCount));
    }
    this.registerProceduralTable('HARMONIC', harmonicPartials);
  }

  private buildFromPartials(partials: {
    real: number[];
    imag: number[];
  }): PeriodicWave {
    const real = new Float32Array(partials.real);
    const imag = new Float32Array(partials.imag);
    return this.ctx.createPeriodicWave(real, imag, {
      disableNormalization: false,
    });
  }

  private sinePartials(n: number): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    imag[1] = 1;
    return { real, imag };
  }

  private sawPartials(n: number): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      imag[i] = (2 / Math.PI) * (Math.pow(-1, i + 1) / i);
    }
    return { real, imag };
  }

  private sawPartialsRolloff(
    n: number,
    rolloff: number,
  ): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      imag[i] = (2 / Math.PI) * (Math.pow(-1, i + 1) / Math.pow(i, rolloff));
    }
    return { real, imag };
  }

  private trianglePartials(n: number): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i += 2) {
      const sign = ((i - 1) / 2) % 2 === 0 ? 1 : -1;
      imag[i] = (sign * 8) / (Math.PI * Math.PI * i * i);
    }
    return { real, imag };
  }

  private squarePartials(n: number): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i += 2) {
      imag[i] = 4 / (Math.PI * i);
    }
    return { real, imag };
  }

  /**
   * A pulse, high for `dutyCycle` of the period from its start: cosine
   * terms sin(2πkd)/(kπ) and sine terms 2·sin²(πkd)/(kπ). At d = 0.5 it is
   * the square. The old terms put a centred pulse's cosine series on the
   * sines, which is its Hilbert transform: spikes, ~10 dB quieter (audit
   * 2026-10-21).
   */
  private pwmPartials(
    n: number,
    dutyCycle: number,
  ): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const k = i * Math.PI;
      real[i] = Math.sin(2 * k * dutyCycle) / k;
      imag[i] = (2 * Math.sin(k * dutyCycle) ** 2) / k;
    }
    return { real, imag };
  }

  private formantPartials(
    n: number,
    formantHarmonics: number[],
  ): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      // Base sawtooth-like envelope (gentle rolloff)
      let amp = 1 / Math.pow(i, 0.8);
      // Boost harmonics near formant centers with a resonant peak
      for (const center of formantHarmonics) {
        const dist = Math.abs(i - center);
        const bandwidth = Math.max(2, center * 0.3);
        amp += 1.5 * Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth));
      }
      imag[i] = amp * (2 / Math.PI) * (Math.pow(-1, i + 1) / i);
    }
    return { real, imag };
  }

  private harmonicSeriesPartials(
    n: number,
    harmonicCount: number,
  ): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i <= Math.min(harmonicCount, n - 1); i++) {
      // Equal amplitude harmonics with slight rolloff for naturalness
      imag[i] = 1 / Math.pow(i, 0.3);
    }
    return { real, imag };
  }

  getWave(tableName: string, frameIndex: number): PeriodicWave | null {
    const table = this.resolveTable(tableName);
    if (!table) return null;
    const idx = Math.max(0, Math.min(frameIndex, table.length - 1));
    return table[idx];
  }

  getTableSize(tableName: string): number {
    return this.resolveTable(tableName)?.length ?? 0;
  }

  getInterpolationPair(
    tableName: string,
    position: number,
  ): { waveA: PeriodicWave; waveB: PeriodicWave; mix: number } | null {
    const table = this.resolveTable(tableName);
    if (!table || table.length === 0) return null;

    const scaledPos = position * (table.length - 1);
    const indexA = Math.floor(scaledPos);
    const indexB = Math.min(indexA + 1, table.length - 1);
    const mix = scaledPos - indexA;

    return {
      waveA: table[indexA],
      waveB: table[indexB],
      mix,
    };
  }

  getTableNames(): string[] {
    return Array.from(this.tables.keys());
  }
}
