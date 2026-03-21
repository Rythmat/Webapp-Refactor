// ── PianoTemplates.test.ts ───────────────────────────────────────────────
// Tests for spectral template generation.

import { describe, it, expect, beforeEach } from 'vitest';
import { PianoTemplates } from '../PianoTemplates';
import { A4_FREQ } from '../types';

const SR = 48000;
const FFT = 8192;

let templates: PianoTemplates;

beforeEach(() => {
  templates = new PianoTemplates(SR, FFT);
});

describe('Template dimensions', () => {
  it('has 88 keys', () => {
    expect(templates.numKeys).toBe(88);
  });

  it('numBins = fftSize/2 + 1', () => {
    expect(templates.numBins).toBe(FFT / 2 + 1);
  });

  it('template matrix has correct total length', () => {
    const matrix = templates.getTemplateMatrix();
    expect(matrix.length).toBe(88 * templates.numBins);
  });
});

describe('Template normalization', () => {
  it('each template has unit L2 norm', () => {
    for (let midi = 21; midi <= 108; midi++) {
      const tmpl = templates.getTemplate(midi);
      let sumSq = 0;
      for (let i = 0; i < tmpl.length; i++) sumSq += tmpl[i] * tmpl[i];
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3);
    }
  });
});

describe('Fundamental peak location', () => {
  it('A4 (MIDI 69) template peaks near 440 Hz bin', () => {
    const tmpl = templates.getTemplate(69);
    const binWidth = SR / FFT;
    const expectedBin = Math.round(A4_FREQ / binWidth);

    // Find peak bin
    let peakBin = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < tmpl.length; i++) {
      if (tmpl[i] > peakVal) {
        peakVal = tmpl[i];
        peakBin = i;
      }
    }

    expect(Math.abs(peakBin - expectedBin)).toBeLessThanOrEqual(2);
  });

  it('C4 (MIDI 60) template peaks near 261.63 Hz bin', () => {
    const tmpl = templates.getTemplate(60);
    const binWidth = SR / FFT;
    const f0 = A4_FREQ * Math.pow(2, (60 - 69) / 12);
    const expectedBin = Math.round(f0 / binWidth);

    let peakBin = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < tmpl.length; i++) {
      if (tmpl[i] > peakVal) {
        peakVal = tmpl[i];
        peakBin = i;
      }
    }

    expect(Math.abs(peakBin - expectedBin)).toBeLessThanOrEqual(2);
  });
});

describe('Harmonics', () => {
  it('A4 template has energy at 2nd harmonic (880 Hz)', () => {
    const tmpl = templates.getTemplate(69);
    const binWidth = SR / FFT;
    const harmBin = Math.round(880 / binWidth);

    // Should have non-zero energy near 880 Hz
    let energy = 0;
    for (let b = harmBin - 2; b <= harmBin + 2; b++) {
      if (b >= 0 && b < tmpl.length) energy += tmpl[b];
    }
    expect(energy).toBeGreaterThan(0);
  });
});

describe('Inharmonicity by register', () => {
  it('bass keys have lower inharmonicity than treble', () => {
    // This is validated indirectly: bass template harmonics should be
    // less stretched (closer to integer multiples) than treble harmonics.
    // We verify by checking that the 5th harmonic peak of a bass note
    // is closer to 5×f0 than for a treble note.
    const bassNote = 24; // C1
    const trebleNote = 96; // C7

    const bassF0 = A4_FREQ * Math.pow(2, (bassNote - 69) / 12);
    const trebleF0 = A4_FREQ * Math.pow(2, (trebleNote - 69) / 12);

    const binWidth = SR / FFT;

    // For bass: 5th harmonic ≈ 5 × f0
    const bassExpected = Math.round((5 * bassF0) / binWidth);
    const bassTmpl = templates.getTemplate(bassNote);
    let bassPeak = bassExpected;
    let bassPeakVal = -Infinity;
    for (
      let b = Math.max(0, bassExpected - 5);
      b <= Math.min(bassTmpl.length - 1, bassExpected + 5);
      b++
    ) {
      if (bassTmpl[b] > bassPeakVal) {
        bassPeakVal = bassTmpl[b];
        bassPeak = b;
      }
    }
    const bassDeviation = Math.abs(bassPeak - bassExpected);

    // For treble: 5th harmonic should be more stretched
    const trebleExpected = Math.round((5 * trebleF0) / binWidth);
    const trebleTmpl = templates.getTemplate(trebleNote);
    if (trebleExpected < trebleTmpl.length) {
      let treblePeak = trebleExpected;
      let treblePeakVal = -Infinity;
      for (
        let b = Math.max(0, trebleExpected - 5);
        b <= Math.min(trebleTmpl.length - 1, trebleExpected + 5);
        b++
      ) {
        if (trebleTmpl[b] > treblePeakVal) {
          treblePeakVal = trebleTmpl[b];
          treblePeak = b;
        }
      }
      const trebleDeviation = Math.abs(treblePeak - trebleExpected);
      expect(trebleDeviation).toBeGreaterThanOrEqual(bassDeviation);
    }
  });
});

describe('setInharmonicity', () => {
  it('changes the template for a specific key', () => {
    const before = new Float64Array(templates.getTemplate(69));
    templates.setInharmonicity(69, 0.01); // very high inharmonicity
    const after = templates.getTemplate(69);

    // Template should differ
    let diff = 0;
    for (let i = 0; i < before.length; i++)
      diff += Math.abs(before[i] - after[i]);
    expect(diff).toBeGreaterThan(0.01);
  });
});

describe('applySpectralCorrection', () => {
  it('correction vector must match numBins', () => {
    const wrongSize = new Float64Array(100);
    const before = new Float64Array(templates.getTemplate(69));
    templates.applySpectralCorrection(wrongSize);
    const after = templates.getTemplate(69);
    // Should be unchanged
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBeCloseTo(before[i], 10);
    }
  });

  it('applies correction and re-normalizes', () => {
    const correction = new Float64Array(templates.numBins).fill(2.0);
    templates.applySpectralCorrection(correction);

    // After correction, templates should still have unit L2 norm
    const tmpl = templates.getTemplate(69);
    let sumSq = 0;
    for (let i = 0; i < tmpl.length; i++) sumSq += tmpl[i] * tmpl[i];
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3);
  });
});

describe('Out-of-range getTemplate', () => {
  it('returns zero array for invalid MIDI note', () => {
    const tmpl = templates.getTemplate(10); // below MIDI 21
    expect(tmpl.length).toBe(templates.numBins);
    let sum = 0;
    for (let i = 0; i < tmpl.length; i++) sum += tmpl[i];
    expect(sum).toBe(0);
  });
});
