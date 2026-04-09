/**
 * Phase 5 — GCM completeness & validity tests.
 *
 * Verifies all 42 genre×level entries exist, required fields are populated,
 * and scales parse without error.
 */

import { describe, it, expect } from 'vitest';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import {
  getGCMEntry,
  getGenreLevels,
  getAllScales,
  getTempoRange,
  getSwingValue,
  getGrooves,
  getGenresForScale,
  validateMapCompleteness,
} from '../data/gcmHelpers';
import { GENRE_CURRICULUM_MAP } from '../data/genreCurriculumMap';
import type { CurriculumLevelId } from '../types/curriculum';

const ALL_GENRES: CurriculumGenreId[] = [
  'AFRICAN',
  'BLUES',
  'ELECTRONIC',
  'FOLK',
  'FUNK',
  'HIP HOP',
  'JAM BAND',
  'JAZZ',
  'LATIN',
  'NEO SOUL',
  'POP',
  'R&B',
  'REGGAE',
  'ROCK',
];
const ALL_LEVELS: CurriculumLevelId[] = ['L1', 'L2', 'L3'];

describe('GCM completeness', () => {
  it('has exactly 42 entries (14 genres × 3 levels)', () => {
    expect(Object.keys(GENRE_CURRICULUM_MAP)).toHaveLength(42);
  });

  it('validateMapCompleteness returns no missing keys', () => {
    expect(validateMapCompleteness()).toEqual([]);
  });

  for (const genre of ALL_GENRES) {
    for (const level of ALL_LEVELS) {
      describe(`${genre} ${level}`, () => {
        it('exists and has correct genre/level fields', () => {
          const entry = getGCMEntry(genre, level);
          expect(entry.genre).toBe(genre);
          expect(entry.level).toBe(level);
        });

        it('has valid melody params', () => {
          const entry = getGCMEntry(genre, level);
          expect(entry.melody.scale).toBeDefined();
          expect(entry.melody.scale.intervals.length).toBeGreaterThan(0);
          expect(entry.melody.contourNotes.length).toBeGreaterThan(0);
          expect(entry.melody.contourTiers.length).toBeGreaterThan(0);
          expect(entry.melody.rhythmTiers.length).toBeGreaterThan(0);
          expect(entry.melody.contourConcat).toBeGreaterThanOrEqual(1);
          expect(entry.melody.phraseRhythmGenre).toBeTruthy();
        });

        it('has valid chord params', () => {
          const entry = getGCMEntry(genre, level);
          expect(entry.chords.chordTypes).toBeTruthy();
          expect(entry.chords.progressions.length).toBeGreaterThan(0);
        });

        it('has valid global params', () => {
          const entry = getGCMEntry(genre, level);
          expect(entry.global.defaultKey).toBeTruthy();
          expect(entry.global.tempoRange).toHaveLength(2);
          expect(entry.global.tempoRange[0]).toBeLessThan(
            entry.global.tempoRange[1],
          );
          expect(entry.global.grooves.length).toBeGreaterThan(0);
        });

        it('scales parse without NaN intervals', () => {
          const scales = getAllScales(genre, level);
          for (const scale of scales) {
            expect(scale.name).toBeTruthy();
            expect(scale.intervals.every((n) => !isNaN(n))).toBe(true);
          }
        });
      });
    }
  }
});

describe('GCM helpers', () => {
  it('getGenreLevels returns 3 entries', () => {
    const [l1, l2, l3] = getGenreLevels('JAZZ');
    expect(l1.level).toBe('L1');
    expect(l2.level).toBe('L2');
    expect(l3.level).toBe('L3');
  });

  it('getTempoRange returns valid range', () => {
    const range = getTempoRange('POP', 'L1');
    expect(range).toEqual([70, 110]);
  });

  it('getSwingValue returns midpoint for ranges', () => {
    // Jazz L1 swing is [5, 7], midpoint = 6
    expect(getSwingValue('JAZZ', 'L1')).toBe(6);
  });

  it('getSwingValue returns number for single values', () => {
    expect(getSwingValue('POP', 'L1')).toBe(0);
  });

  it('getGrooves returns non-empty array', () => {
    const grooves = getGrooves('FUNK', 'L1');
    expect(grooves.length).toBeGreaterThan(0);
    expect(grooves[0]).toMatch(/^groove_/);
  });

  it('getGenresForScale finds dorian across genres', () => {
    const results = getGenresForScale('dorian');
    expect(results.length).toBeGreaterThan(3);
    expect(results.some((r) => r.genre === 'JAZZ')).toBe(true);
    expect(results.some((r) => r.genre === 'FUNK')).toBe(true);
  });

  it('getGCMEntry throws for invalid key', () => {
    expect(() => getGCMEntry('INVALID' as CurriculumGenreId, 'L1')).toThrow();
  });
});
