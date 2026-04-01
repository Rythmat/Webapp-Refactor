import { describe, it, expect } from 'vitest';
import {
  detectSecondaryDominant,
  detectSecondaryDominants,
} from '../engine/secondaryDominant';

// Pitch classes: C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8, A=9, Bb=10, B=11

describe('detectSecondaryDominant', () => {
  // ── V7/ii ──────────────────────────────────────────────────────────────
  it('detects A7 → Dm as V7/ii in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant7',
      2,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('secondary-dominant');
    expect(result!.label).toBe('V7/ii');
    expect(result!.targetDegree).toBe(2);
    expect(result!.resolved).toBe(true);
  });

  // ── V7/iii ─────────────────────────────────────────────────────────────
  it('detects B7 → Em as V7/iii in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      11,
      'dominant7',
      4,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/iii');
    expect(result!.resolved).toBe(true);
  });

  // ── V7/IV ──────────────────────────────────────────────────────────────
  it('detects C7 → F as V7/IV in C ionian', () => {
    // C7 in C ionian — C is degree 1 but with dominant7 quality (not diatonic maj7)
    // C is the root (degree 5 of F), target F = degree 4
    // BUT: C is degree 1 (the V of IV), and our code skips V7/I
    // Wait — C is degree 1, not degree 5. The expected target of C7 is F (pc=5), degree 4.
    // chordDegree check: C (pc=0) in C ionian → degree 1, not 5 → proceeds.
    const result = detectSecondaryDominant(
      0,
      'dominant7',
      5,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/IV');
    expect(result!.resolved).toBe(true);
  });

  // ── V7/V ───────────────────────────────────────────────────────────────
  it('detects D7 → G as V7/V in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      2,
      'dominant7',
      7,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/V');
    expect(result!.targetDegree).toBe(5);
    expect(result!.resolved).toBe(true);
  });

  // ── V7/vi ──────────────────────────────────────────────────────────────
  it('detects E7 → Am as V7/vi in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      4,
      'dominant7',
      9,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/vi');
    expect(result!.targetDegree).toBe(6);
    expect(result!.resolved).toBe(true);
  });

  // ── Unresolved secondary dominant ──────────────────────────────────────
  it('detects A7 as V7/ii even when unresolved (wrong next chord)', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant7',
      5,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/ii');
    expect(result!.resolved).toBe(false);
  });

  it('detects A7 as V7/ii when it is the last chord (no next)', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant7',
      null,
      null,
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/ii');
    expect(result!.resolved).toBe(false);
  });

  // ── Regular V7 → NOT a secondary dominant ──────────────────────────────
  it('does not flag G7 as secondary dominant in C ionian (regular V7)', () => {
    const result = detectSecondaryDominant(
      7,
      'dominant7',
      0,
      'major',
      0,
      'ionian',
    );
    expect(result).toBeNull();
  });

  // ── Non-dominant quality → not detected ────────────────────────────────
  it('does not flag major chord as secondary dominant', () => {
    const result = detectSecondaryDominant(9, 'major', 2, 'minor', 0, 'ionian');
    expect(result).toBeNull();
  });

  it('does not flag minor chord as secondary dominant', () => {
    const result = detectSecondaryDominant(9, 'minor', 2, 'minor', 0, 'ionian');
    expect(result).toBeNull();
  });

  // ── Target not diatonic → not a secondary dominant ─────────────────────
  it('does not detect when target is not diatonic', () => {
    // Bb7 in C ionian → expected target Eb (pc=3). Eb is not a scale degree in C ionian.
    const result = detectSecondaryDominant(
      10,
      'dominant7',
      3,
      'major',
      0,
      'ionian',
    );
    expect(result).toBeNull();
  });

  // ── Extended dominant qualities ────────────────────────────────────────
  it('detects dominant9 as secondary dominant', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant9',
      2,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/ii');
  });

  it('detects dominant13 as secondary dominant', () => {
    const result = detectSecondaryDominant(
      2,
      'dominant13',
      7,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/V');
  });

  // ── Secondary leading tone (viidim7/X) ─────────────────────────────────
  it('detects G#dim7 → Am as viidim7/vi in C ionian', () => {
    const result = detectSecondaryDominant(
      8,
      'diminished7',
      9,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('secondary-leading-tone');
    expect(result!.label).toBe('viidim7/vi');
    expect(result!.resolved).toBe(true);
  });

  it('detects C#dim7 → Dm as viidim7/ii in C ionian', () => {
    const result = detectSecondaryDominant(
      1,
      'diminished7',
      2,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('secondary-leading-tone');
    expect(result!.label).toBe('viidim7/ii');
    expect(result!.resolved).toBe(true);
  });

  it('does not flag Bdim7 as secondary leading-tone in C ionian (regular viidim7)', () => {
    const result = detectSecondaryDominant(
      11,
      'diminished7',
      0,
      'major',
      0,
      'ionian',
    );
    expect(result).toBeNull();
  });

  // ── Transposed key ─────────────────────────────────────────────────────
  it('works in G ionian: E7 → Am = V7/ii', () => {
    const result = detectSecondaryDominant(
      4,
      'dominant7',
      9,
      'minor',
      7,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('V7/ii');
    expect(result!.resolved).toBe(true);
  });
});

describe('detectSecondaryDominants (batch)', () => {
  it('analyzes a full progression with secondary dominants', () => {
    // C major: I - V7/vi - vi - V7/ii - ii - V7 - I
    const chords = [
      { rootPc: 0, quality: 'major' }, // C = I
      { rootPc: 4, quality: 'dominant7' }, // E7 = V7/vi
      { rootPc: 9, quality: 'minor' }, // Am = vi
      { rootPc: 9, quality: 'dominant7' }, // A7 = V7/ii
      { rootPc: 2, quality: 'minor' }, // Dm = ii
      { rootPc: 7, quality: 'dominant7' }, // G7 = V (regular, not secondary)
      { rootPc: 0, quality: 'major' }, // C = I
    ];

    const results = detectSecondaryDominants(chords, 0, 'ionian');

    expect(results).toHaveLength(7);
    expect(results[0]).toBeNull(); // I — not secondary
    expect(results[1]!.label).toBe('V7/vi'); // E7 → Am
    expect(results[1]!.resolved).toBe(true);
    expect(results[2]).toBeNull(); // Am — not dominant
    expect(results[3]!.label).toBe('V7/ii'); // A7 → Dm
    expect(results[3]!.resolved).toBe(true);
    expect(results[4]).toBeNull(); // Dm — not dominant
    expect(results[5]).toBeNull(); // G7 — regular V7
    expect(results[6]).toBeNull(); // C — not dominant
  });

  it('handles empty input', () => {
    expect(detectSecondaryDominants([], 0, 'ionian')).toEqual([]);
  });

  it('handles single chord', () => {
    const results = detectSecondaryDominants(
      [{ rootPc: 9, quality: 'dominant7' }],
      0,
      'ionian',
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.label).toBe('V7/ii');
    expect(results[0]!.resolved).toBe(false);
  });
});
