import { describe, it, expect } from 'vitest';
import {
  detectSecondaryDominant,
  detectSecondaryDominants,
} from '../engine/secondaryDominant';

// Pitch classes: C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8, A=9, Bb=10, B=11

describe('detectSecondaryDominant', () => {
  // ── 5 of 2 ─────────────────────────────────────────────────────────────
  it('detects A7 → Dm as 5 of 2 in C ionian (resolved)', () => {
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
    expect(result!.label).toBe('5 of 2');
    expect(result!.target).toBe('2');
    expect(result!.targetDegree).toBe(2);
    expect(result!.resolved).toBe(true);
  });

  // ── 5 of 3 ─────────────────────────────────────────────────────────────
  it('detects B7 → Em as 5 of 3 in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      11,
      'dominant7',
      4,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 3');
    expect(result!.resolved).toBe(true);
  });

  // ── 5 of 4 ─────────────────────────────────────────────────────────────
  it('detects C7 → F as 5 of 4 in C ionian', () => {
    // C7 in C ionian: C is the key's 1 chord, but with dominant7 quality.
    // Its expected target is F (pc=5), degree 4. Only a chord that is already
    // the key's 5 chord is skipped, so this proceeds.
    const result = detectSecondaryDominant(
      0,
      'dominant7',
      5,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 4');
    expect(result!.resolved).toBe(true);
  });

  // ── 5 of 5 ─────────────────────────────────────────────────────────────
  it('detects D7 → G as 5 of 5 in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      2,
      'dominant7',
      7,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 5');
    expect(result!.targetDegree).toBe(5);
    expect(result!.resolved).toBe(true);
  });

  // ── 5 of 6 ─────────────────────────────────────────────────────────────
  it('detects E7 → Am as 5 of 6 in C ionian (resolved)', () => {
    const result = detectSecondaryDominant(
      4,
      'dominant7',
      9,
      'minor',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 6');
    expect(result!.targetDegree).toBe(6);
    expect(result!.resolved).toBe(true);
  });

  // ── Unresolved secondary dominant ──────────────────────────────────────
  it('detects A7 as 5 of 2 even when unresolved (wrong next chord)', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant7',
      5,
      'major',
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 2');
    expect(result!.resolved).toBe(false);
  });

  it('detects A7 as 5 of 2 when it is the last chord (no next)', () => {
    const result = detectSecondaryDominant(
      9,
      'dominant7',
      null,
      null,
      0,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 2');
    expect(result!.resolved).toBe(false);
  });

  // ── The key's own 5 dom7 → NOT a secondary dominant ────────────────────
  it('does not flag G7 as secondary dominant in C ionian (the regular 5 dom7)', () => {
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
    expect(result!.label).toBe('5 of 2');
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
    expect(result!.label).toBe('5 of 5');
  });

  // ── Secondary leading tone (7 of X) ────────────────────────────────────
  it('detects G#dim7 → Am as 7 of 6 in C ionian', () => {
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
    expect(result!.label).toBe('7 of 6');
    expect(result!.resolved).toBe(true);
  });

  it('detects C#dim7 → Dm as 7 of 2 in C ionian', () => {
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
    expect(result!.label).toBe('7 of 2');
    expect(result!.resolved).toBe(true);
  });

  it('does not flag Bdim7 as secondary leading-tone in C ionian (the regular 7 dim7)', () => {
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
  it('works in G ionian: E7 → Am = 5 of 2', () => {
    const result = detectSecondaryDominant(
      4,
      'dominant7',
      9,
      'minor',
      7,
      'ionian',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('5 of 2');
    expect(result!.resolved).toBe(true);
  });
});

describe('detectSecondaryDominants (batch)', () => {
  it('analyzes a full progression with secondary dominants', () => {
    // C major: 1 - 5 of 6 - 6 - 5 of 2 - 2 - 5 dom7 - 1
    const chords = [
      { rootPc: 0, quality: 'major' }, // C = 1
      { rootPc: 4, quality: 'dominant7' }, // E7 = 5 of 6
      { rootPc: 9, quality: 'minor' }, // Am = 6
      { rootPc: 9, quality: 'dominant7' }, // A7 = 5 of 2
      { rootPc: 2, quality: 'minor' }, // Dm = 2
      { rootPc: 7, quality: 'dominant7' }, // G7 = 5 (regular, not secondary)
      { rootPc: 0, quality: 'major' }, // C = 1
    ];

    const results = detectSecondaryDominants(chords, 0, 'ionian');

    expect(results).toHaveLength(7);
    expect(results[0]).toBeNull(); // 1 — not secondary
    expect(results[1]!.label).toBe('5 of 6'); // E7 → Am
    expect(results[1]!.resolved).toBe(true);
    expect(results[2]).toBeNull(); // Am — not dominant
    expect(results[3]!.label).toBe('5 of 2'); // A7 → Dm
    expect(results[3]!.resolved).toBe(true);
    expect(results[4]).toBeNull(); // Dm — not dominant
    expect(results[5]).toBeNull(); // G7 — the regular 5 dom7
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
    expect(results[0]!.label).toBe('5 of 2');
    expect(results[0]!.resolved).toBe(false);
  });
});
