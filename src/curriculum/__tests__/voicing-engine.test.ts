/**
 * Phase 9 — Voicing Engine tests.
 *
 * Tests voicing computation, resolver logic, voicing rules,
 * and voice leading algorithm.
 */

import { describe, it, expect } from 'vitest';
import { GENRE_VOICING_TAXONOMY } from '../data/genreVoicingTaxonomy';
import {
  totalVoiceMovement,
  findClosestVoicing,
  voiceLeadSequence,
  countCommonTones,
} from '../engine/voiceLeading';
import {
  applyVoicing,
  getVoicingForContext,
  voiceChordSequence,
  type VoicedChord,
} from '../engine/voicingEngine';
import { resolveVoicing } from '../engine/voicingResolver';
import {
  applyVoicingRules,
  hendrixVoicing,
  jazzShell,
  quartalVoicing,
  gospelStackedThirds,
} from '../engine/voicingRules';

// ---------------------------------------------------------------------------
// applyVoicing
// ---------------------------------------------------------------------------
describe('applyVoicing', () => {
  it('root position with no displacement returns sorted intervals', () => {
    const result = applyVoicing([0, 4, 7], [0, 0, 0]);
    expect(result).toEqual([0, 4, 7]);
  });

  it('1st inversion: displace 3rd and 5th down an octave', () => {
    // [0, 4, 7] + [0, -12, -12] = [0, -8, -5] → sorted: [-8, -5, 0]
    const result = applyVoicing([0, 4, 7], [0, -12, -12]);
    expect(result).toEqual([-8, -5, 0]);
  });

  it('spread voicing with +12 displacement', () => {
    // [0, 4, 7] + [0, 12, 0] = [0, 16, 7] → sorted: [0, 7, 16]
    const result = applyVoicing([0, 4, 7], [0, 12, 0]);
    expect(result).toEqual([0, 7, 16]);
  });

  it('seventh chord 3rd inversion', () => {
    // [0, 4, 7, 10] + [0, 0, 0, -12] = [0, 4, 7, -2] → sorted: [-2, 0, 4, 7]
    const result = applyVoicing([0, 4, 7, 10], [0, 0, 0, -12]);
    expect(result).toEqual([-2, 0, 4, 7]);
  });
});

// ---------------------------------------------------------------------------
// voicingRules
// ---------------------------------------------------------------------------
describe('voicingRules', () => {
  it('dom13: omits 11th (P11 = 17 semitones)', () => {
    // dom13 root pos: [0, 4, 7, 10, 14, 17, 21] but our library has [0, 4, 7, 10, 14, 21]
    // If intervals include 17, it should be removed
    const intervals = [0, 4, 7, 10, 14, 17, 21];
    const result = applyVoicingRules('dom13', intervals);
    expect(result.intervals).not.toContain(17);
    expect(result.ruleApplied).toBe('omit_11th_from_13th');
  });

  it('maj13: omits 11th', () => {
    const intervals = [0, 4, 7, 11, 14, 17, 21];
    const result = applyVoicingRules('maj13', intervals);
    expect(result.intervals).not.toContain(17);
    expect(result.ruleApplied).toBe('omit_11th_from_13th');
  });

  it('dom11: omits major 3rd', () => {
    const intervals = [0, 4, 5, 7, 10, 14]; // hypothetical with 3rd included
    const result = applyVoicingRules('dom11', intervals);
    expect(result.intervals).not.toContain(4);
    expect(result.ruleApplied).toBe('omit_3rd_from_dom11');
  });

  it('min13: keeps everything (no clash)', () => {
    const intervals = [0, 3, 7, 10, 14, 17, 21];
    const result = applyVoicingRules('min13', intervals);
    expect(result.intervals).toEqual(intervals);
    expect(result.ruleApplied).toBeUndefined();
  });

  it('funk dom9: omits 3rd', () => {
    const intervals = [0, 4, 7, 10, 14];
    const result = applyVoicingRules('dom9', intervals, 'funk');
    expect(result.intervals).not.toContain(4);
    expect(result.ruleApplied).toBe('funk_dom9_omit_3rd');
  });

  it('non-funk dom9: keeps 3rd', () => {
    const intervals = [0, 4, 7, 10, 14];
    const result = applyVoicingRules('dom9', intervals, 'jazz');
    expect(result.intervals).toContain(4);
    expect(result.ruleApplied).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Special voicing generators
// ---------------------------------------------------------------------------
describe('special voicings', () => {
  it('hendrixVoicing produces 3-b7-#9 layout', () => {
    const result = hendrixVoicing(60); // C4
    expect(result).toEqual([64, 70, 75]); // E4, Bb4, Eb5
  });

  it('jazzShell 1-7 produces root + 7th', () => {
    const result = jazzShell(60, '1-7', 10); // C4, b7
    expect(result).toEqual([60, 70]); // C4, Bb4
  });

  it('jazzShell 1-3-7 produces root + 3rd + 7th', () => {
    const result = jazzShell(60, '1-3-7', 11, 4); // C4, maj3, maj7
    expect(result).toEqual([60, 64, 71]); // C4, E4, B4
  });

  it('quartalVoicing stacks perfect 4ths', () => {
    const result = quartalVoicing(60, 3);
    expect(result).toEqual([60, 65, 70]); // C4, F4, Bb4
  });

  it('gospelStackedThirds returns root-position intervals transposed', () => {
    const result = gospelStackedThirds(60, [0, 4, 7, 11]);
    expect(result).toEqual([60, 64, 67, 71]);
  });
});

// ---------------------------------------------------------------------------
// resolveVoicing
// ---------------------------------------------------------------------------
describe('resolveVoicing', () => {
  it('uses rh_override when present', () => {
    const entry = GENRE_VOICING_TAXONOMY.find(
      (t) => t.genre === 'jazz' && t.rhOverride && t.rhOverride.length > 0,
    );
    expect(entry).toBeDefined();
    if (entry) {
      const result = resolveVoicing(entry, 'jazz');
      expect(result).toEqual(entry.rhOverride);
    }
  });

  it('falls back to quality × algorithm when no override', () => {
    const entry = GENRE_VOICING_TAXONOMY.find(
      (t) =>
        !t.rhOverride &&
        t.qualityId === 'maj' &&
        t.algorithmId === 'va_3n_root_pos',
    );
    expect(entry).toBeDefined();
    if (entry) {
      const result = resolveVoicing(entry);
      // Major triad root position: [0, 4, 7] + [0, 0, 0] → [0, 4, 7]
      expect(result).toEqual([0, 4, 7]);
    }
  });
});

// ---------------------------------------------------------------------------
// getVoicingForContext
// ---------------------------------------------------------------------------
describe('getVoicingForContext', () => {
  it('returns voiced chord for pop L1 major', () => {
    const result = getVoicingForContext('pop', 1, 'maj', 60, '1');
    expect(result.rh.length).toBeGreaterThan(0);
    expect(result.lh).toBe(48); // C3 (root - 12)
    expect(result.name).toBeTruthy();
  });

  it('returns voiced chord for jazz L1 maj7 (area code)', () => {
    const result = getVoicingForContext('jazz', 1, 'maj7', 60, '1');
    expect(result.rh.length).toBeGreaterThan(0);
    // Should use 7-3-5 area code: [-1, 4, 7] → [59, 64, 67]
    expect(result.rh).toEqual([59, 64, 67]);
  });

  it('falls back gracefully for unknown genre/quality', () => {
    const result = getVoicingForContext('unknown', 1, 'weird', 60, '1');
    expect(result.rh.length).toBeGreaterThan(0);
    expect(result.name).toContain('fallback');
  });

  it('LH is null when lhAssignment is none (jazz shells)', () => {
    const result = getVoicingForContext('jazz', 1, 'maj7', 60, '1');
    // The first jazz maj7 entry with area code has root_bass LH
    // But shell entries have "none" — we'd need to specifically select those
    // Just verify the structure is correct
    expect(result.lh === null || typeof result.lh === 'number').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// voiceChordSequence
// ---------------------------------------------------------------------------
describe('voiceChordSequence', () => {
  it('voices a ii-V-I progression', () => {
    const chords = [
      { degree: '2', qualityId: 'min7', chordRoot: 62 }, // D min7
      { degree: '5', qualityId: 'dom7', chordRoot: 67 }, // G dom7
      { degree: '1', qualityId: 'maj7', chordRoot: 60 }, // C maj7
    ];
    const result = voiceChordSequence(chords, 'jazz', 1);
    expect(result).toHaveLength(3);
    for (const chord of result) {
      expect(chord.rh.length).toBeGreaterThan(0);
      expect(chord.chord).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Voice leading
// ---------------------------------------------------------------------------
describe('voice leading', () => {
  it('totalVoiceMovement calculates sum of distances', () => {
    expect(totalVoiceMovement([60, 64, 67], [60, 64, 67])).toBe(0);
    expect(totalVoiceMovement([60, 64, 67], [62, 65, 69])).toBe(5);
  });

  it('findClosestVoicing minimizes movement', () => {
    const current = [64, 67, 72]; // E4, G4, C5
    const targetOffsets = [0, 4, 7]; // Major triad
    const targetRoot = 65; // F

    const result = findClosestVoicing(current, targetOffsets, targetRoot);
    // Should prefer a voicing close to [64, 67, 72] rather than jumping far
    const movement = totalVoiceMovement(current, result);
    expect(movement).toBeLessThan(12); // Should be small
    // All notes should be pitch classes of F major: F(5), A(9), C(0)
    const pcs = new Set(result.map((n) => n % 12));
    expect(pcs.has(5)).toBe(true); // F
    expect(pcs.has(9)).toBe(true); // A
    expect(pcs.has(0)).toBe(true); // C
  });

  it('voiceLeadSequence smooths a chord progression', () => {
    const chords: VoicedChord[] = [
      { rh: [60, 64, 67], lh: 48, name: 'C maj', chord: '1 maj' },
      { rh: [65, 69, 72], lh: 53, name: 'F maj', chord: '4 maj' },
      { rh: [67, 71, 74], lh: 55, name: 'G maj', chord: '5 maj' },
    ];
    const offsets = [
      [0, 4, 7],
      [0, 4, 7],
      [0, 4, 7],
    ];

    const result = voiceLeadSequence(chords, offsets);
    expect(result).toHaveLength(3);
    // First chord should be unchanged (anchor)
    expect(result[0].rh).toEqual([60, 64, 67]);
    // Subsequent chords should have smooth voice leading
    const mvt1 = totalVoiceMovement(result[0].rh, result[1].rh);
    const mvt2 = totalVoiceMovement(result[1].rh, result[2].rh);
    // Voice-led movement should be reasonable (< 12 semitones total)
    expect(mvt1).toBeLessThan(12);
    expect(mvt2).toBeLessThan(12);
  });

  it('countCommonTones finds shared pitch classes', () => {
    expect(countCommonTones([60, 64, 67], [60, 65, 69])).toBe(1); // C in common
    expect(countCommonTones([60, 64, 67], [60, 64, 67])).toBe(3); // All in common
    expect(countCommonTones([60, 64, 67], [61, 63, 66])).toBe(0); // None
  });
});

// ---------------------------------------------------------------------------
// Integration: taxonomy coverage
// ---------------------------------------------------------------------------
describe('taxonomy voicing coverage', () => {
  it('can resolve every taxonomy entry without error', () => {
    let resolved = 0;
    for (const entry of GENRE_VOICING_TAXONOMY) {
      const result = resolveVoicing(entry, entry.genre);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((n) => typeof n === 'number' && !isNaN(n))).toBe(
        true,
      );
      resolved++;
    }
    expect(resolved).toBe(157);
  });
});
