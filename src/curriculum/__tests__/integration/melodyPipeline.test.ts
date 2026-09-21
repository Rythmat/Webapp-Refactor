/**
 * Phase 20 — Melody Pipeline Integration Tests.
 *
 * Generates melody for every genre×level combination and validates
 * output is valid MIDI with sensible ranges.
 */

import { describe, it, expect } from 'vitest';
import { hasMajorThird, noteViolation } from '@/lib/melody/majorChordRule';
import { CURRICULUM_GENRE_IDS } from '../../bridge/genreIdMap';
import { getGCMEntry } from '../../data/gcmHelpers';
import { generateFullActivity } from '../../engine/contentOrchestrator';
import { generateCurriculumMelody } from '../../engine/melodyPipeline';
import type { CurriculumLevelId } from '../../types/curriculum';

const C4 = 60;
const LEVELS: CurriculumLevelId[] = ['L1', 'L2', 'L3'];

describe('melodyPipeline integration — all 42 genre×level combos', () => {
  for (const genre of CURRICULUM_GENRE_IDS) {
    for (const level of LEVELS) {
      it(`${genre} ${level} produces valid melody`, () => {
        const gcm = getGCMEntry(genre, level);
        // Run 3 times to catch random variation issues
        for (let run = 0; run < 3; run++) {
          const melody = generateCurriculumMelody(gcm, C4);
          // Should not throw — empty is acceptable for sparse coverage
          for (const event of melody) {
            expect(event.note).toBeGreaterThanOrEqual(24); // C1 minimum
            expect(event.note).toBeLessThanOrEqual(108); // C8 maximum
            expect(event.onset).toBeGreaterThanOrEqual(0);
            expect(event.duration).toBeGreaterThan(0);
            expect(Number.isFinite(event.note)).toBe(true);
            expect(Number.isFinite(event.onset)).toBe(true);
            expect(Number.isFinite(event.duration)).toBe(true);
          }
        }
      });
    }
  }
});

describe('the 4 over a major chord', () => {
  it('never hangs unresolved in a generated activity', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      for (const level of LEVELS) {
        for (let run = 0; run < 3; run += 1) {
          const activity = generateFullActivity(genre, level, 0);
          const windows = activity.progression.map((chord) => ({
            rootPc: ((chord.chordRoot % 12) + 12) % 12,
            majorThird: hasMajorThird(
              chord.rh.map((midi) => midi - chord.chordRoot),
            ),
            startTick: chord.onset,
            endTick: chord.onset + chord.duration,
          }));
          const notes = [...activity.melody]
            .sort((a, b) => a.onset - b.onset)
            .map((n) => ({
              midi: n.note,
              startTick: n.onset,
              durationTicks: n.duration,
            }));
          const offending = notes
            .map((note, i) => ({ note, next: notes[i + 1] }))
            .filter(({ note, next }) => noteViolation(note, next, windows))
            .map(({ note }) => note.midi);

          expect({ genre, level, offending }).toMatchObject({ offending: [] });
        }
      }
    }
  });
});
