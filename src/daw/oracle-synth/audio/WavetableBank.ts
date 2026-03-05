/**
 * Generates and stores wavetable data as PeriodicWave objects.
 * Each "wavetable" is an array of PeriodicWave frames.
 * WT POS morphs between adjacent frames.
 */
export class WavetableBank {
  private ctx: AudioContext;
  private tables: Map<string, PeriodicWave[]> = new Map();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.generateBasicTables();
  }

  private generateBasicTables(): void {
    const N = 128; // number of harmonics

    // Sine: only fundamental
    this.tables.set('SINE WAVE', [
      this.buildFromPartials(this.sinePartials(N)),
    ]);

    // Sawtooth: all harmonics, amplitude 1/n
    this.tables.set('SAWTOOTH', [this.buildFromPartials(this.sawPartials(N))]);

    // Triangle: odd harmonics, amplitude 1/n^2, alternating sign
    this.tables.set('TRIANGLE', [
      this.buildFromPartials(this.trianglePartials(N)),
    ]);

    // Square: odd harmonics, amplitude 1/n
    this.tables.set('SQUARE', [this.buildFromPartials(this.squarePartials(N))]);

    // PWM table: multiple frames with varying pulse width
    const pwmFrames: PeriodicWave[] = [];
    for (let i = 0; i < 16; i++) {
      const dutyCycle = 0.1 + (i / 15) * 0.8; // 10% to 90%
      pwmFrames.push(this.buildFromPartials(this.pwmPartials(N, dutyCycle)));
    }
    this.tables.set('PWM', pwmFrames);

    // Supersaw: multiple slightly different saw shapes for morphing
    const supersawFrames: PeriodicWave[] = [];
    for (let i = 0; i < 8; i++) {
      const rolloff = 0.5 + (i / 7) * 1.5; // harmonic rolloff variation
      supersawFrames.push(
        this.buildFromPartials(this.sawPartialsRolloff(N, rolloff)),
      );
    }
    this.tables.set('SUPER SAW', supersawFrames);

    // Formant: 12 frames morphing through vowel-like formant shapes (A→E→I→O→U and blends)
    const formantFrames: PeriodicWave[] = [];
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
    for (const formants of vowelFormants) {
      formantFrames.push(
        this.buildFromPartials(this.formantPartials(N, formants)),
      );
    }
    this.tables.set('FORMANT', formantFrames);

    // Harmonic Series: 16 frames from pure fundamental to full harmonics
    const harmonicFrames: PeriodicWave[] = [];
    for (let i = 0; i < 16; i++) {
      const harmonicCount = 1 + Math.round((i / 15) * (N - 2)); // 1 to N-1 harmonics
      harmonicFrames.push(
        this.buildFromPartials(this.harmonicSeriesPartials(N, harmonicCount)),
      );
    }
    this.tables.set('HARMONIC', harmonicFrames);
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

  private pwmPartials(
    n: number,
    dutyCycle: number,
  ): { real: number[]; imag: number[] } {
    const real = new Array(n).fill(0);
    const imag = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * dutyCycle);
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
    const table = this.tables.get(tableName);
    if (!table) return null;
    const idx = Math.max(0, Math.min(frameIndex, table.length - 1));
    return table[idx];
  }

  getTableSize(tableName: string): number {
    return this.tables.get(tableName)?.length ?? 0;
  }

  getInterpolationPair(
    tableName: string,
    position: number,
  ): { waveA: PeriodicWave; waveB: PeriodicWave; mix: number } | null {
    const table = this.tables.get(tableName);
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
