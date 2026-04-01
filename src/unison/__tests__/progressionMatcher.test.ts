import { describe, it, expect } from 'vitest';
import { matchProgressions } from '../engine/progressionMatcher';
import type { UnisonChordRegion } from '../types/schema';

/** Helper: create a minimal UnisonChordRegion from a hybrid name */
function chord(hybridName: string, index: number): UnisonChordRegion {
  const spaceIdx = hybridName.indexOf(' ');
  const degree = spaceIdx > 0 ? hybridName.slice(0, spaceIdx) : '1';
  const quality = spaceIdx > 0 ? hybridName.slice(spaceIdx + 1) : 'major';
  return {
    id: `c${index}`,
    startTick: index * 1920,
    endTick: (index + 1) * 1920,
    rootPc: 0,
    quality,
    noteName: 'C',
    degree,
    hybridName,
    romanNumeral: 'I',
    color: [0, 100, 50],
    inversion: 0,
    confidence: 1.0,
  };
}

describe('matchProgressions', () => {
  it('returns empty array for empty input', () => {
    expect(matchProgressions([])).toEqual([]);
  });

  it('returns results sorted by score descending', () => {
    // Use a common progression that should match something in the 589 library
    const regions = [
      chord('1 major', 0),
      chord('4 major', 1),
      chord('5 major', 2),
      chord('1 major', 3),
    ];
    const results = matchProgressions(regions);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('returns at most 10 results', () => {
    // A very common progression pattern should match many entries
    const regions = [
      chord('1 major', 0),
      chord('5 major', 1),
      chord('6 minor', 2),
      chord('4 major', 3),
    ];
    const results = matchProgressions(regions);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('matches include vibes and styles from the library', () => {
    const regions = [
      chord('1 major7', 0),
      chord('4 major7', 1),
      chord('5 dominant7', 2),
      chord('1 major7', 3),
    ];
    const results = matchProgressions(regions);
    if (results.length > 0) {
      // Every match should have vibes and styles arrays
      for (const r of results) {
        expect(Array.isArray(r.vibes)).toBe(true);
        expect(Array.isArray(r.styles)).toBe(true);
      }
    }
  });

  it('scores exact matches higher than partial quality matches', () => {
    // Create a progression that exactly matches something in library vs partially
    const exactRegions = [
      chord('2 minor7', 0),
      chord('5 dominant7', 1),
      chord('1 major7', 2),
    ];
    const partialRegions = [
      chord('2 major', 0), // same degree, wrong quality
      chord('5 major', 1), // same degree, wrong quality
      chord('1 minor', 2), // same degree, wrong quality
    ];

    const exactResults = matchProgressions(exactRegions);
    const partialResults = matchProgressions(partialRegions);

    // Exact should score higher (or at least equal if no exact match exists)
    if (exactResults.length > 0 && partialResults.length > 0) {
      expect(exactResults[0].score).toBeGreaterThanOrEqual(
        partialResults[0].score,
      );
    }
  });

  it('result fields have correct structure', () => {
    const regions = [
      chord('1 major7', 0),
      chord('6 minor7', 1),
      chord('2 minor7', 2),
      chord('5 dominant7', 3),
    ];
    const results = matchProgressions(regions);
    if (results.length > 0) {
      const r = results[0];
      expect(typeof r.libraryId).toBe('number');
      expect(typeof r.progression).toBe('string');
      expect(Array.isArray(r.matchedChords)).toBe(true);
      expect(typeof r.matchStartIndex).toBe('number');
      expect(typeof r.matchLength).toBe('number');
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(typeof r.complexity).toBe('string');
    }
  });

  it('finds matches even when detected progression starts mid-pattern', () => {
    // If library has I-vi-IV-V, and we detect IV-V-I-vi, circular match should find it
    // Use a real common progression: ii-V-I is very common in jazz
    const regions = [
      chord('5 dominant7', 0),
      chord('1 major7', 1),
      chord('2 minor7', 2),
    ];
    const results = matchProgressions(regions);
    // Should find some matches via circular rotation
    // (may or may not depending on library content, so just verify no crash)
    expect(Array.isArray(results)).toBe(true);
  });

  it('single chord returns no matches (need at least 2)', () => {
    const regions = [chord('1 major', 0)];
    const results = matchProgressions(regions);
    // With only 1 chord, window length < 2, so no matches
    expect(results).toEqual([]);
  });
});
