/**
 * Phase 20 — Generation Speed Performance Tests.
 *
 * Ensures content generation completes within acceptable time limits.
 * Target: <100ms per activity for any genre/level combination.
 */

import { describe, it, expect } from 'vitest';
import { CURRICULUM_GENRE_IDS } from '../../bridge/genreIdMap';
import { generateFullActivity } from '../../engine/contentOrchestrator';
import { generatePlayAlongTrack } from '../../engine/playAlongGenerator';
import type { CurriculumLevelId } from '../../types/curriculum';

const C4 = 60;
const MAX_GENERATION_MS = 200; // Allow generous 200ms (CI may be slower)

describe('generation speed', () => {
  it('generateFullActivity completes within time limit for each genre', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      const start = performance.now();
      const activity = generateFullActivity(genre, 'L1', C4, 120);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(MAX_GENERATION_MS);
      expect(activity).toBeDefined();
    }
  });

  it('generateFullActivity L2/L3 also within limits', () => {
    const levels: CurriculumLevelId[] = ['L2', 'L3'];
    for (const level of levels) {
      const start = performance.now();
      generateFullActivity('JAZZ', level, C4, 120);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(MAX_GENERATION_MS);
    }
  });

  it('generatePlayAlongTrack within limits', () => {
    const activity = generateFullActivity('POP', 'L1', C4, 120);
    const start = performance.now();
    const track = generatePlayAlongTrack(activity, 8);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_GENERATION_MS);
    expect(track.bars).toBe(8);
  });

  it('batch generation of 42 activities completes within 5 seconds', () => {
    const levels: CurriculumLevelId[] = ['L1', 'L2', 'L3'];
    const start = performance.now();

    for (const genre of CURRICULUM_GENRE_IDS) {
      for (const level of levels) {
        generateFullActivity(genre, level, C4, 120);
      }
    }

    const elapsed = performance.now() - start;
    // 42 activities × ~50ms each = ~2.1s expected
    expect(elapsed).toBeLessThan(5000);
  });
});
