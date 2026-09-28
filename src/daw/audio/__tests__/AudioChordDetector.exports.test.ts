// ── AudioChordDetector.exports.test.ts ─────────────────────────────────────
// Guitar lessons read the detector through additive exports and accessors.
// The Studio depends on analyze() staying bit-identical, so the scripted run
// below is pinned by an inline snapshot recorded before the accessors existed.

import { describe, it, expect } from 'vitest';
import {
  AudioChordDetector,
  CHORD_PRIOR,
  DETECTABLE_CHORD_QUALITIES,
  type AudioChordResult,
} from '../AudioChordDetector';
import { createMockAnalyser } from '../../../learn/audio/v2/__tests__/testUtils';

const SAMPLE_RATE = 48000;
const FFT_SIZE = 16384;
const BIN_HZ = SAMPLE_RATE / FFT_SIZE;

/** dB spectrum with a fundamental and a quieter 2nd harmonic per note. */
function spectrum(midis: number[]): Float32Array {
  const data = new Float32Array(FFT_SIZE / 2).fill(-100);
  for (const midi of midis) {
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    data[Math.round(hz / BIN_HZ)] = -20;
    data[Math.round((2 * hz) / BIN_HZ)] = -35;
  }
  return data;
}

const SOUND = new Float32Array(FFT_SIZE).fill(0.1);
const SILENCE = new Float32Array(FFT_SIZE);

type Frame = { midis: number[] | null; key?: [number, number[]] };

const OPEN_C = [48, 52, 55, 60, 64];
const OPEN_AM7 = [45, 52, 55, 60, 64];
const G7 = [43, 47, 50, 53, 55, 59];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];

const SCRIPT: Frame[] = [
  { midis: null },
  { midis: null },
  ...Array.from({ length: 8 }, () => ({ midis: OPEN_C })),
  ...Array.from({ length: 8 }, () => ({ midis: OPEN_AM7 })),
  ...Array.from({ length: 3 }, () => ({ midis: [45, 57] })),
  { midis: G7, key: [0, IONIAN] },
  ...Array.from({ length: 5 }, () => ({ midis: G7 })),
  { midis: null },
  { midis: null },
  { midis: null },
];

function run(onFrame?: (detector: AudioChordDetector) => void) {
  const detector = new AudioChordDetector(FFT_SIZE, 'guitar');
  const analyser = createMockAnalyser({
    sampleRate: SAMPLE_RATE,
    fftSize: FFT_SIZE,
  });
  return SCRIPT.map((frame) => {
    if (frame.key) detector.setKeyContext(...frame.key);
    analyser.setTimeDomainData(frame.midis ? SOUND : SILENCE);
    analyser.setFrequencyData(spectrum(frame.midis ?? []));
    const result = detector.analyze(analyser as unknown as AnalyserNode);
    onFrame?.(detector);
    return result;
  });
}

describe('AudioChordDetector — analyze() output is unchanged', () => {
  it('matches the pre-accessor recording frame for frame', () => {
    expect(run()).toMatchInlineSnapshot(`
      [
        null,
        null,
        null,
        null,
        null,
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        {
          "confidence": 0.9561136330664833,
          "quality": "major",
          "rootPc": 0,
          "tuningCents": undefined,
        },
        null,
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        {
          "confidence": 0.9971187101618846,
          "quality": "minor",
          "rootPc": 9,
          "tuningCents": 1.8450782884441985,
        },
        null,
        null,
        null,
        null,
        {
          "confidence": 1.1023650062479005,
          "quality": "major",
          "rootPc": 7,
          "tuningCents": undefined,
        },
        {
          "confidence": 1.1023650062479005,
          "quality": "major",
          "rootPc": 7,
          "tuningCents": undefined,
        },
        {
          "confidence": 1.1023650062479005,
          "quality": "major",
          "rootPc": 7,
          "tuningCents": undefined,
        },
        {
          "confidence": 1.1023650062479005,
          "quality": "major",
          "rootPc": 7,
          "tuningCents": -1.1532008988475229,
        },
        {
          "confidence": 1.1023650062479005,
          "quality": "major",
          "rootPc": 7,
          "tuningCents": -1.1532008988475229,
        },
        null,
      ]
    `);
  });
});

describe('AudioChordDetector — last-frame accessors', () => {
  it('reading the accessors every frame does not change analyze()', () => {
    const read = run((detector) => {
      detector.getLastFrameMatch();
      detector.getLastChroma()?.fill(0);
    });
    expect(read).toEqual(run());
  });

  it('reports the raw frame match before the vote settles', () => {
    const matches: (AudioChordResult | null)[] = [];
    const voted = run((detector) => matches.push(detector.getLastFrameMatch()));
    // First open-C frame: the vote is still empty, the frame already knows.
    expect(voted[2]).toBeNull();
    expect(matches[2]).toMatchObject({ rootPc: 0, quality: 'major' });
    // First Am7 frame: the vote still holds C, the frame has moved on.
    expect(voted[10]).toMatchObject({ rootPc: 0, quality: 'major' });
    expect(matches[10]?.rootPc).toBe(9);
  });

  it('is null on silent frames', () => {
    const matches: (AudioChordResult | null)[] = [];
    const chromas: (Float64Array | null)[] = [];
    run((detector) => {
      matches.push(detector.getLastFrameMatch());
      chromas.push(detector.getLastChroma());
    });
    SCRIPT.forEach((frame, i) => {
      expect(matches[i] === null).toBe(frame.midis === null);
      expect(chromas[i] === null).toBe(frame.midis === null);
    });
  });

  it('is null when fewer than two pitch classes sound', () => {
    const detector = new AudioChordDetector(FFT_SIZE, 'guitar');
    const analyser = createMockAnalyser({
      sampleRate: SAMPLE_RATE,
      fftSize: FFT_SIZE,
      timeDomainData: SOUND,
      frequencyData: spectrum([57, 69]), // A3 + A4
    });
    detector.analyze(analyser as unknown as AnalyserNode);
    expect(detector.getLastFrameMatch()).toBeNull();
    expect(detector.getLastChroma()).toBeNull();
  });

  it('returns a normalised chroma copy peaking on the chord tones', () => {
    const detector = new AudioChordDetector(FFT_SIZE, 'guitar');
    const analyser = createMockAnalyser({
      sampleRate: SAMPLE_RATE,
      fftSize: FFT_SIZE,
      timeDomainData: SOUND,
      frequencyData: spectrum(OPEN_C),
    });
    detector.analyze(analyser as unknown as AnalyserNode);

    const chroma = detector.getLastChroma()!;
    expect(chroma).toHaveLength(12);
    const norm = Math.hypot(...chroma);
    expect(norm).toBeCloseTo(1, 6);
    const top = [...chroma.keys()].sort((a, b) => chroma[b] - chroma[a]);
    expect(top.slice(0, 2).sort()).toEqual([0, 4]);

    chroma.fill(0);
    expect(Math.hypot(...detector.getLastChroma()!)).toBeCloseTo(1, 6);

    detector.reset();
    expect(detector.getLastChroma()).toBeNull();
    expect(detector.getLastFrameMatch()).toBeNull();
  });
});

describe('AudioChordDetector — exported tables', () => {
  it('can detect every quality the guitar book uses', () => {
    for (const quality of [
      'major',
      'minor',
      'major7',
      'minor7',
      'dominant7',
      'minor7b5',
    ]) {
      expect(DETECTABLE_CHORD_QUALITIES.has(quality)).toBe(true);
      expect(CHORD_PRIOR[quality]).toBeGreaterThan(0);
    }
  });
});
