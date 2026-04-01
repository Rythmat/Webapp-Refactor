import { describe, it, expect, beforeEach } from 'vitest';
import { detectMixturePatterns } from '../engine/modeMixture';
import type { KeyDetection, UnisonChordRegion } from '../types/schema';

// Pitch classes: C=0, D=2, Eb=3, E=4, F=5, G=7, Ab=8, A=9, Bb=10, B=11

let idCounter = 0;
function chord(
  rootPc: number,
  quality: string,
  noteName: string,
  overrides?: Partial<UnisonChordRegion>,
): UnisonChordRegion {
  return {
    id: `c${idCounter++}`,
    startTick: 0,
    endTick: 1920,
    rootPc,
    quality,
    noteName,
    degree: '1',
    hybridName: `1 ${quality}`,
    romanNumeral: 'I',
    color: [100, 100, 100] as [number, number, number],
    inversion: 0,
    confidence: 1.0,
    ...overrides,
  };
}

const cMajor: KeyDetection = {
  rootPc: 0,
  rootName: 'C',
  mode: 'ionian',
  modeDisplay: 'Ionian',
  confidence: 0.9,
  alternateKeys: [],
};

const aMinor: KeyDetection = {
  rootPc: 9,
  rootName: 'A',
  mode: 'aeolian',
  modeDisplay: 'Aeolian',
  confidence: 0.9,
  alternateKeys: [],
};

describe('detectMixturePatterns', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  // ── Minor Plagal ───────────────────────────────────────────────────────
  it('detects minor plagal: F major → F minor → C major', () => {
    const chords = [
      chord(5, 'major', 'F'),
      chord(5, 'minor', 'F'),
      chord(0, 'major', 'C'),
    ];
    const patterns = detectMixturePatterns(chords, cMajor);
    const mp = patterns.find((p) => p.type === 'minor-plagal');
    expect(mp).toBeDefined();
    expect(mp!.startIndex).toBe(0);
    expect(mp!.endIndex).toBe(2);
  });

  it('does not detect minor plagal in minor key', () => {
    const chords = [
      chord(2, 'major', 'D'),
      chord(2, 'minor', 'D'),
      chord(9, 'minor', 'A'),
    ];
    const patterns = detectMixturePatterns(chords, aMinor);
    const mp = patterns.find((p) => p.type === 'minor-plagal');
    expect(mp).toBeUndefined();
  });

  // ── Picardy Third ─────────────────────────────────────────────────────
  it('detects Picardy third: minor key ending on A major', () => {
    const chords = [
      chord(9, 'minor', 'A'),
      chord(2, 'minor', 'D'),
      chord(4, 'major', 'E'), // V
      chord(9, 'major', 'A'), // I major (Picardy!)
    ];
    const patterns = detectMixturePatterns(chords, aMinor);
    const pt = patterns.find((p) => p.type === 'picardy-third');
    expect(pt).toBeDefined();
    expect(pt!.startIndex).toBe(3);
  });

  it('does not detect Picardy in major key', () => {
    const chords = [
      chord(0, 'major', 'C'),
      chord(5, 'major', 'F'),
      chord(7, 'major', 'G'),
      chord(0, 'major', 'C'),
    ];
    const patterns = detectMixturePatterns(chords, cMajor);
    const pt = patterns.find((p) => p.type === 'picardy-third');
    expect(pt).toBeUndefined();
  });

  // ── Backdoor Dominant ──────────────────────────────────────────────────
  it('detects backdoor dominant: Bb7 → C major', () => {
    const chords = [chord(10, 'dominant7', 'Bb'), chord(0, 'major', 'C')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const bd = patterns.find((p) => p.type === 'backdoor-dominant');
    expect(bd).toBeDefined();
    expect(bd!.label).toContain('Backdoor');
  });

  it('does not detect backdoor without dominant quality', () => {
    const chords = [chord(10, 'major', 'Bb'), chord(0, 'major', 'C')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const bd = patterns.find((p) => p.type === 'backdoor-dominant');
    expect(bd).toBeUndefined();
  });

  // ── Tritone Substitution ───────────────────────────────────────────────
  it('detects tritone substitution: Db7 → C major', () => {
    const chords = [chord(1, 'dominant7', 'Db'), chord(0, 'major', 'C')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const ts = patterns.find((p) => p.type === 'tritone-substitution');
    expect(ts).toBeDefined();
    expect(ts!.label).toContain('Tritone');
  });

  // ── Deceptive Resolution ───────────────────────────────────────────────
  it('detects deceptive cadence: G → Am (V → vi)', () => {
    const chords = [chord(7, 'major', 'G'), chord(9, 'minor', 'A')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const dr = patterns.find((p) => p.type === 'deceptive-resolution');
    expect(dr).toBeDefined();
    expect(dr!.label).toContain('V → vi');
  });

  it('detects chromatic deceptive: G → Ab major (V → bVI)', () => {
    const chords = [chord(7, 'dominant7', 'G'), chord(8, 'major', 'Ab')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const dr = patterns.find((p) => p.type === 'deceptive-resolution');
    expect(dr).toBeDefined();
    expect(dr!.label).toContain('V → bVI');
  });

  // ── Chromatic Mediant ──────────────────────────────────────────────────
  it('detects chromatic mediant: C major → Ab major (down 4 semitones)', () => {
    const chords = [chord(0, 'major', 'C'), chord(8, 'major', 'Ab')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const cm = patterns.find((p) => p.type === 'chromatic-mediant');
    expect(cm).toBeDefined();
  });

  it('detects chromatic mediant: C major → Eb major (up 3 semitones)', () => {
    const chords = [chord(0, 'major', 'C'), chord(3, 'major', 'Eb')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const cm = patterns.find((p) => p.type === 'chromatic-mediant');
    expect(cm).toBeDefined();
  });

  it('does not detect chromatic mediant for non-major chords', () => {
    const chords = [chord(0, 'major', 'C'), chord(3, 'minor', 'Eb')];
    const patterns = detectMixturePatterns(chords, cMajor);
    const cm = patterns.find((p) => p.type === 'chromatic-mediant');
    expect(cm).toBeUndefined();
  });

  // ── No patterns in simple diatonic progression ─────────────────────────
  it('finds no minor plagal, Picardy, backdoor, or tritone sub in I-IV-V-I', () => {
    const chords = [
      chord(0, 'major', 'C'),
      chord(5, 'major', 'F'),
      chord(7, 'major', 'G'),
      chord(0, 'major', 'C'),
    ];
    const patterns = detectMixturePatterns(chords, cMajor);
    expect(patterns.find((p) => p.type === 'minor-plagal')).toBeUndefined();
    expect(patterns.find((p) => p.type === 'picardy-third')).toBeUndefined();
    expect(
      patterns.find((p) => p.type === 'backdoor-dominant'),
    ).toBeUndefined();
    expect(
      patterns.find((p) => p.type === 'tritone-substitution'),
    ).toBeUndefined();
  });

  // ── Empty input ────────────────────────────────────────────────────────
  it('returns empty array for empty chords', () => {
    expect(detectMixturePatterns([], cMajor)).toEqual([]);
  });

  it('returns empty array for single chord', () => {
    expect(detectMixturePatterns([chord(0, 'major', 'C')], cMajor)).toEqual([]);
  });
});
