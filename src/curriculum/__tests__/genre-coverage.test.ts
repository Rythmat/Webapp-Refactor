/**
 * Phase 4 — Genre coverage validation.
 *
 * Verifies every curriculum genre has an engine match or explicit fallback,
 * and all engine genres are accounted for.
 */

import { describe, it, expect } from 'vitest';
import type { GenreName } from '@prism/engine';
import {
  CURRICULUM_TO_ENGINE_GENRE,
  ENGINE_TO_CURRICULUM_GENRE,
  CURRICULUM_GENRE_SLUGS,
  SLUG_TO_CURRICULUM_GENRE,
  curriculumToEngineGenre,
  engineToCurriculumGenre,
  type CurriculumGenreId,
} from '../bridge/genreIdMap';

/** All 14 curriculum genres */
const ALL_CURRICULUM_GENRES: CurriculumGenreId[] = [
  'AFRICAN',
  'BLUES',
  'ELECTRONIC',
  'FOLK',
  'FUNK',
  'HIP-HOP',
  'JAM BAND',
  'JAZZ',
  'LATIN',
  'NEO SOUL',
  'POP',
  'R&B',
  'REGGAE',
  'ROCK',
];

/** Engine genres that are sub-genres (no direct curriculum match) */
const SUB_GENRES: GenreName[] = [
  'Salsa',
  'Merengue',
  'Bossa',
  'Samba',
  'Ballad',
];

describe('Genre coverage', () => {
  describe('every curriculum genre maps to an engine genre', () => {
    for (const genre of ALL_CURRICULUM_GENRES) {
      it(`${genre} → engine GenreName`, () => {
        const engineGenre = curriculumToEngineGenre(genre);
        expect(engineGenre).toBeDefined();
        expect(typeof engineGenre).toBe('string');
      });
    }
  });

  describe('CURRICULUM_TO_ENGINE_GENRE has exactly 14 entries', () => {
    it('has 14 curriculum genres', () => {
      expect(Object.keys(CURRICULUM_TO_ENGINE_GENRE)).toHaveLength(14);
    });
  });

  describe('engine sub-genres fall back to curriculum genres', () => {
    for (const subGenre of SUB_GENRES) {
      it(`${subGenre} falls back via ENGINE_ONLY_GENRES`, () => {
        const fallback = engineToCurriculumGenre(subGenre);
        expect(fallback).toBeDefined();
      });
    }
  });

  describe('reverse map covers all direct engine genres', () => {
    it('ENGINE_TO_CURRICULUM_GENRE has 14 entries', () => {
      expect(Object.keys(ENGINE_TO_CURRICULUM_GENRE)).toHaveLength(14);
    });

    it('round-trips: curriculum → engine → curriculum', () => {
      for (const genre of ALL_CURRICULUM_GENRES) {
        const engineGenre = CURRICULUM_TO_ENGINE_GENRE[genre];
        const backToCurriculum = ENGINE_TO_CURRICULUM_GENRE[engineGenre];
        expect(backToCurriculum).toBe(genre);
      }
    });
  });

  describe('genre slugs', () => {
    it('every curriculum genre has a slug', () => {
      for (const genre of ALL_CURRICULUM_GENRES) {
        expect(CURRICULUM_GENRE_SLUGS[genre]).toBeDefined();
        expect(CURRICULUM_GENRE_SLUGS[genre]).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    });

    it('slug → genre round-trip works', () => {
      for (const genre of ALL_CURRICULUM_GENRES) {
        const slug = CURRICULUM_GENRE_SLUGS[genre];
        expect(SLUG_TO_CURRICULUM_GENRE[slug]).toBe(genre);
      }
    });

    it('all slugs are unique', () => {
      const slugs = Object.values(CURRICULUM_GENRE_SLUGS);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });
});
