/**
 * Phase 20 — Voicing Engine Integration Tests.
 *
 * Voices chords for each genre voicing taxonomy entry and verifies
 * all notes fall in playable piano range.
 */

import { describe, it, expect } from 'vitest';
import {
  CURRICULUM_GENRE_SLUGS,
  CURRICULUM_GENRE_IDS,
} from '../../bridge/genreIdMap';
import { GENRE_VOICING_TAXONOMY } from '../../data/genreVoicingTaxonomy';
import { getVoicingForContext } from '../../engine/voicingEngine';

const C4 = 60;

/** Piano playable range: A0 (21) to C8 (108) */
const MIN_MIDI = 21;
const MAX_MIDI = 108;

describe('voicingEngine integration — taxonomy entries', () => {
  // Test a representative sample of taxonomy entries
  const entries = GENRE_VOICING_TAXONOMY.slice(0, 50);

  for (const entry of entries) {
    it(`voices ${entry.genre} L${entry.level} ${entry.qualityId}`, () => {
      const voiced = getVoicingForContext(
        entry.genre,
        entry.level,
        entry.qualityId,
        C4,
        '1',
      );

      expect(voiced).toBeDefined();
      expect(voiced.rh.length).toBeGreaterThan(0);

      // All RH notes in playable range
      for (const note of voiced.rh) {
        expect(note).toBeGreaterThanOrEqual(MIN_MIDI);
        expect(note).toBeLessThanOrEqual(MAX_MIDI);
        expect(Number.isInteger(note)).toBe(true);
      }

      // LH note in bass range if present
      if (voiced.lh !== null) {
        expect(voiced.lh).toBeGreaterThanOrEqual(MIN_MIDI);
        expect(voiced.lh).toBeLessThanOrEqual(MAX_MIDI);
      }
    });
  }
});

describe('voicingEngine integration — all genres at C4', () => {
  const LEVELS = [1, 2, 3];
  const QUALITIES = ['maj', 'min', 'dom7', 'maj7', 'min7'];

  for (const genre of CURRICULUM_GENRE_IDS) {
    const slug = CURRICULUM_GENRE_SLUGS[genre];
    for (const level of LEVELS) {
      for (const quality of QUALITIES) {
        it(`${genre} L${level} ${quality} produces valid voicing`, () => {
          const voiced = getVoicingForContext(slug, level, quality, C4, '1');
          expect(voiced.rh.length).toBeGreaterThan(0);

          for (const note of voiced.rh) {
            expect(note).toBeGreaterThanOrEqual(MIN_MIDI);
            expect(note).toBeLessThanOrEqual(MAX_MIDI);
          }
        });
      }
    }
  }
});
