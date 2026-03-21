import { describe, it, expect } from 'vitest';
import {
  isDiatonic,
  getScaleDegree,
  getExpectedQualities,
} from '../engine/diatonicChecker';

// Pitch classes: C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8, A=9, Bb=10, B=11

describe('getScaleDegree', () => {
  it('returns correct degrees for C ionian', () => {
    expect(getScaleDegree(0, 0, 'ionian')).toBe(1); // C
    expect(getScaleDegree(2, 0, 'ionian')).toBe(2); // D
    expect(getScaleDegree(4, 0, 'ionian')).toBe(3); // E
    expect(getScaleDegree(5, 0, 'ionian')).toBe(4); // F
    expect(getScaleDegree(7, 0, 'ionian')).toBe(5); // G
    expect(getScaleDegree(9, 0, 'ionian')).toBe(6); // A
    expect(getScaleDegree(11, 0, 'ionian')).toBe(7); // B
  });

  it('returns null for chromatic notes', () => {
    expect(getScaleDegree(1, 0, 'ionian')).toBeNull(); // C#
    expect(getScaleDegree(3, 0, 'ionian')).toBeNull(); // Eb
    expect(getScaleDegree(6, 0, 'ionian')).toBeNull(); // F#
    expect(getScaleDegree(8, 0, 'ionian')).toBeNull(); // Ab
    expect(getScaleDegree(10, 0, 'ionian')).toBeNull(); // Bb
  });

  it('works with transposed keys', () => {
    // G ionian: G A B C D E F#
    expect(getScaleDegree(7, 7, 'ionian')).toBe(1); // G
    expect(getScaleDegree(9, 7, 'ionian')).toBe(2); // A
    expect(getScaleDegree(11, 7, 'ionian')).toBe(3); // B
    expect(getScaleDegree(0, 7, 'ionian')).toBe(4); // C
    expect(getScaleDegree(2, 7, 'ionian')).toBe(5); // D
    expect(getScaleDegree(5, 7, 'ionian')).toBeNull(); // F (not in G ionian)
    expect(getScaleDegree(6, 7, 'ionian')).toBe(7); // F#
  });

  it('works with aeolian (natural minor)', () => {
    // C aeolian: C D Eb F G Ab Bb
    expect(getScaleDegree(0, 0, 'aeolian')).toBe(1);
    expect(getScaleDegree(3, 0, 'aeolian')).toBe(3); // Eb
    expect(getScaleDegree(8, 0, 'aeolian')).toBe(6); // Ab
    expect(getScaleDegree(10, 0, 'aeolian')).toBe(7); // Bb
    expect(getScaleDegree(4, 0, 'aeolian')).toBeNull(); // E natural
  });

  it('works with harmonic minor', () => {
    // C harmonic minor: C D Eb F G Ab B
    expect(getScaleDegree(11, 0, 'harmonicMinor')).toBe(7); // B natural
    expect(getScaleDegree(10, 0, 'harmonicMinor')).toBeNull(); // Bb
  });

  it('works with melodic minor', () => {
    // C melodic minor: C D Eb F G A B
    expect(getScaleDegree(9, 0, 'melodicMinor')).toBe(6); // A natural
    expect(getScaleDegree(11, 0, 'melodicMinor')).toBe(7); // B natural
    expect(getScaleDegree(8, 0, 'melodicMinor')).toBeNull(); // Ab
  });

  it('returns null for unknown mode', () => {
    expect(getScaleDegree(0, 0, 'nonExistentMode')).toBeNull();
  });
});

describe('getExpectedQualities', () => {
  it('returns correct triads for ionian', () => {
    expect(getExpectedQualities(1, 'ionian').triad).toBe('major');
    expect(getExpectedQualities(2, 'ionian').triad).toBe('minor');
    expect(getExpectedQualities(3, 'ionian').triad).toBe('minor');
    expect(getExpectedQualities(4, 'ionian').triad).toBe('major');
    expect(getExpectedQualities(5, 'ionian').triad).toBe('major');
    expect(getExpectedQualities(6, 'ionian').triad).toBe('minor');
    expect(getExpectedQualities(7, 'ionian').triad).toBe('diminished');
  });

  it('returns correct tetrads for ionian', () => {
    expect(getExpectedQualities(1, 'ionian').tetrad).toBe('major7');
    expect(getExpectedQualities(2, 'ionian').tetrad).toBe('minor7');
    expect(getExpectedQualities(5, 'ionian').tetrad).toBe('dominant7');
    expect(getExpectedQualities(7, 'ionian').tetrad).toBe('minor7b5');
  });

  it('returns correct triads for aeolian', () => {
    expect(getExpectedQualities(1, 'aeolian').triad).toBe('minor');
    expect(getExpectedQualities(3, 'aeolian').triad).toBe('major');
    expect(getExpectedQualities(6, 'aeolian').triad).toBe('major');
    expect(getExpectedQualities(7, 'aeolian').triad).toBe('major');
  });

  it('returns correct qualities for harmonic minor', () => {
    expect(getExpectedQualities(1, 'harmonicMinor').triad).toBe('minor');
    expect(getExpectedQualities(3, 'harmonicMinor').triad).toBe('augmented');
    expect(getExpectedQualities(5, 'harmonicMinor').triad).toBe('major');
    expect(getExpectedQualities(5, 'harmonicMinor').tetrad).toBe('dominant7');
    expect(getExpectedQualities(7, 'harmonicMinor').tetrad).toBe('diminished7');
  });

  it('returns correct qualities for melodic minor', () => {
    expect(getExpectedQualities(1, 'melodicMinor').tetrad).toBe('minormajor7');
    expect(getExpectedQualities(4, 'melodicMinor').tetrad).toBe('dominant7');
  });

  it('derives qualities for rotational modes (phrygian dominant)', () => {
    // Phrygian dominant is mode 5 of harmonic minor
    // Scale: 1 b2 3 4 5 b6 b7
    // Degree 1 triad: major (1 3 5), tetrad: dominant7 (1 3 5 b7)
    expect(getExpectedQualities(1, 'phrygianDominant').triad).toBe('major');
    expect(getExpectedQualities(1, 'phrygianDominant').tetrad).toBe(
      'dominant7',
    );
  });

  it('derives qualities for lydian dominant', () => {
    // Lydian dominant is mode 4 of melodic minor
    // Degree 1: major triad, dominant7 tetrad
    expect(getExpectedQualities(1, 'lydianDominant').triad).toBe('major');
    expect(getExpectedQualities(1, 'lydianDominant').tetrad).toBe('dominant7');
  });

  it('returns undefined for invalid degree', () => {
    expect(getExpectedQualities(0, 'ionian').triad).toBeUndefined();
    expect(getExpectedQualities(8, 'ionian').triad).toBeUndefined();
  });
});

describe('isDiatonic', () => {
  // ── C Ionian diatonic triads ───────────────────────────────────────────
  it('recognizes all diatonic triads in C ionian', () => {
    expect(isDiatonic(0, 'major', 0, 'ionian')).toBe(true); // I = C major
    expect(isDiatonic(2, 'minor', 0, 'ionian')).toBe(true); // ii = D minor
    expect(isDiatonic(4, 'minor', 0, 'ionian')).toBe(true); // iii = E minor
    expect(isDiatonic(5, 'major', 0, 'ionian')).toBe(true); // IV = F major
    expect(isDiatonic(7, 'major', 0, 'ionian')).toBe(true); // V = G major
    expect(isDiatonic(9, 'minor', 0, 'ionian')).toBe(true); // vi = A minor
    expect(isDiatonic(11, 'diminished', 0, 'ionian')).toBe(true); // viidim = B dim
  });

  // ── C Ionian diatonic tetrads ──────────────────────────────────────────
  it('recognizes diatonic tetrads in C ionian', () => {
    expect(isDiatonic(0, 'major7', 0, 'ionian')).toBe(true); // Imaj7
    expect(isDiatonic(2, 'minor7', 0, 'ionian')).toBe(true); // iim7
    expect(isDiatonic(7, 'dominant7', 0, 'ionian')).toBe(true); // V7
    expect(isDiatonic(11, 'minor7b5', 0, 'ionian')).toBe(true); // viim7b5
  });

  // ── Non-diatonic chords in C Ionian ────────────────────────────────────
  it('rejects non-diatonic chords in C ionian', () => {
    expect(isDiatonic(0, 'minor', 0, 'ionian')).toBe(false); // Cm (not in C major)
    expect(isDiatonic(5, 'minor', 0, 'ionian')).toBe(false); // Fm (iv, from aeolian)
    expect(isDiatonic(8, 'major', 0, 'ionian')).toBe(false); // Ab major (bVI)
    expect(isDiatonic(10, 'major', 0, 'ionian')).toBe(false); // Bb major (bVII)
    expect(isDiatonic(1, 'major', 0, 'ionian')).toBe(false); // Db major (chromatic root)
  });

  // ── Wrong quality at correct degree ────────────────────────────────────
  it('rejects wrong quality even if root is diatonic', () => {
    expect(isDiatonic(2, 'major', 0, 'ionian')).toBe(false); // D major (ii should be minor)
    expect(isDiatonic(7, 'minor', 0, 'ionian')).toBe(false); // Gm (V should be major)
    expect(isDiatonic(0, 'dominant7', 0, 'ionian')).toBe(false); // C7 (I should be maj7)
  });

  // ── C Aeolian (natural minor) ──────────────────────────────────────────
  it('recognizes diatonic triads in C aeolian', () => {
    expect(isDiatonic(0, 'minor', 0, 'aeolian')).toBe(true); // i = Cm
    expect(isDiatonic(3, 'major', 0, 'aeolian')).toBe(true); // bIII = Eb major
    expect(isDiatonic(5, 'minor', 0, 'aeolian')).toBe(true); // iv = Fm
    expect(isDiatonic(8, 'major', 0, 'aeolian')).toBe(true); // bVI = Ab major
    expect(isDiatonic(10, 'major', 0, 'aeolian')).toBe(true); // bVII = Bb major
  });

  it('rejects non-diatonic chords in C aeolian', () => {
    expect(isDiatonic(0, 'major', 0, 'aeolian')).toBe(false); // C major (Picardy)
    expect(isDiatonic(7, 'major', 0, 'aeolian')).toBe(false); // G major (V from harm. minor)
  });

  // ── Transposed keys ────────────────────────────────────────────────────
  it('works with G ionian', () => {
    expect(isDiatonic(7, 'major', 7, 'ionian')).toBe(true); // G major (I)
    expect(isDiatonic(9, 'minor', 7, 'ionian')).toBe(true); // Am (ii)
    expect(isDiatonic(2, 'major', 7, 'ionian')).toBe(true); // D major (V)
    expect(isDiatonic(5, 'major', 7, 'ionian')).toBe(false); // F major (bVII in G)
  });

  it('works with A aeolian', () => {
    expect(isDiatonic(9, 'minor', 9, 'aeolian')).toBe(true); // Am (i)
    expect(isDiatonic(0, 'major', 9, 'aeolian')).toBe(true); // C major (bIII)
    expect(isDiatonic(5, 'major', 9, 'aeolian')).toBe(true); // F major (bVI)
    expect(isDiatonic(2, 'major', 9, 'aeolian')).toBe(false); // D major (IV, from dorian)
  });

  // ── Extended chords match base quality ─────────────────────────────────
  it('matches extended chords against base quality', () => {
    expect(isDiatonic(7, 'dominant9', 0, 'ionian')).toBe(true); // G9 ≈ G7 (V)
    expect(isDiatonic(0, 'major9', 0, 'ionian')).toBe(true); // Cmaj9 ≈ Cmaj7 (I)
    expect(isDiatonic(2, 'minor9', 0, 'ionian')).toBe(true); // Dm9 ≈ Dm7 (ii)
    expect(isDiatonic(7, 'dominant13', 0, 'ionian')).toBe(true); // G13 ≈ G7 (V)
  });

  // ── Non-diatonic mode families ─────────────────────────────────────────
  it('works with harmonic minor', () => {
    // C harmonic minor: Cm, Ddim, Ebaug, Fm, G, Ab, Bdim
    expect(isDiatonic(0, 'minor', 0, 'harmonicMinor')).toBe(true); // i
    expect(isDiatonic(7, 'major', 0, 'harmonicMinor')).toBe(true); // V
    expect(isDiatonic(7, 'dominant7', 0, 'harmonicMinor')).toBe(true); // V7
    expect(isDiatonic(3, 'augmented', 0, 'harmonicMinor')).toBe(true); // bIII+
    expect(isDiatonic(11, 'diminished7', 0, 'harmonicMinor')).toBe(true); // viidim7
  });

  it('works with melodic minor', () => {
    // C melodic minor: Cm, Dm, Ebaug, F, G, Adim, Bdim
    expect(isDiatonic(0, 'minor', 0, 'melodicMinor')).toBe(true);
    expect(isDiatonic(0, 'minormajor7', 0, 'melodicMinor')).toBe(true); // imMaj7
    expect(isDiatonic(5, 'major', 0, 'melodicMinor')).toBe(true); // IV
    expect(isDiatonic(5, 'dominant7', 0, 'melodicMinor')).toBe(true); // IV7
  });

  // ── Abbreviated quality matching ───────────────────────────────────────
  it('handles abbreviated quality names', () => {
    expect(isDiatonic(0, 'maj', 0, 'ionian')).toBe(true);
    expect(isDiatonic(2, 'min', 0, 'ionian')).toBe(true);
    expect(isDiatonic(7, 'dom7', 0, 'ionian')).toBe(true);
    expect(isDiatonic(11, 'dim', 0, 'ionian')).toBe(true);
  });

  // ── Dorian ─────────────────────────────────────────────────────────────
  it('works with D dorian', () => {
    // D dorian: Dm, Em, F, G, Am, Bdim, C
    expect(isDiatonic(2, 'minor', 2, 'dorian')).toBe(true); // i = Dm
    expect(isDiatonic(5, 'major', 2, 'dorian')).toBe(true); // bIII = F
    expect(isDiatonic(7, 'major', 2, 'dorian')).toBe(true); // IV = G
    expect(isDiatonic(7, 'dominant7', 2, 'dorian')).toBe(true); // IV7 = G7
    expect(isDiatonic(0, 'major', 2, 'dorian')).toBe(true); // bVII = C
    expect(isDiatonic(2, 'major', 2, 'dorian')).toBe(false); // D major (not dorian)
  });

  // ── Mixolydian ─────────────────────────────────────────────────────────
  it('works with G mixolydian', () => {
    // G mixolydian: G, Am, Bdim, C, Dm, Em, F
    expect(isDiatonic(7, 'major', 7, 'mixolydian')).toBe(true); // I = G
    expect(isDiatonic(7, 'dominant7', 7, 'mixolydian')).toBe(true); // I7 = G7
    expect(isDiatonic(5, 'major', 7, 'mixolydian')).toBe(true); // bVII = F
    expect(isDiatonic(7, 'major7', 7, 'mixolydian')).toBe(false); // Gmaj7 (not mixo)
  });
});
