/**
 * Phase 4 — Chord interval consistency validation.
 *
 * Verifies that every overlapping chord between curriculum and engine
 * has identical interval arrays.
 */

import { describe, it, expect } from 'vitest';
import { CHORDS } from '@prism/engine';
import { getChordIntervals } from '../bridge/chordBridge';
import {
  CURRICULUM_TO_ENGINE_CHORD,
  CURRICULUM_ONLY_CHORDS,
  ENGINE_ONLY_CHORDS,
} from '../bridge/chordIdMap';

/**
 * Curriculum chord intervals — the authoritative intervals from
 * Chord_Quality_Library.csv (root_position column).
 */
const CURRICULUM_CHORD_INTERVALS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  aug: [0, 4, 8],
  dim: [0, 3, 6],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  quartal: [0, 5, 10],
  maj4: [0, 4, 5],
  min4: [0, 3, 5],
  sus_s4: [0, 6, 7],
  sus_b2: [0, 1, 7],
  sus_b2b5: [0, 1, 6],
  sus2_b5: [0, 2, 6],
  power: [0, 7],
  maj6: [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  dim7: [0, 3, 6, 9],
  min7b5: [0, 3, 6, 10],
  dim_maj7: [0, 3, 6, 11],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  maj7_s5: [0, 4, 8, 11],
  maj7_b5: [0, 4, 6, 11],
  min7: [0, 3, 7, 10],
  min7_s5: [0, 3, 8, 10],
  min_maj7: [0, 3, 7, 11],
  dom7sus2: [0, 2, 7, 10],
  dom7sus4: [0, 5, 7, 10],
  maj7sus2: [0, 2, 7, 11],
  maj7sus4: [0, 5, 7, 11],
  dom7b5: [0, 4, 6, 10],
  dom7s5: [0, 4, 8, 10],
  add2: [0, 2, 4, 7],
  add4: [0, 4, 5, 7],
  dom9: [0, 4, 7, 10, 14],
  dom7b9: [0, 4, 7, 10, 13],
  dom7s9: [0, 4, 7, 10, 15],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  min69: [0, 3, 7, 9, 14],
  dom7s11: [0, 4, 7, 10, 14, 18],
  maj7s11: [0, 4, 7, 11, 14, 18],
  dom13: [0, 4, 7, 10, 14, 21],
  maj13: [0, 4, 7, 11, 14, 21],
  min13: [0, 3, 7, 10, 14, 17, 21],
  // Slash chords have same intervals as major but different voicing
  maj_over5: [0, 4, 7],
  maj_over4: [0, 4, 7],
  maj_over3: [0, 4, 7],
  maj_over6: [0, 4, 7],
};

/**
 * Known interval differences between curriculum and engine.
 * These are intentional divergences, not bugs:
 * - min13: curriculum includes 11th [0,3,7,10,14,17,21] (7-note),
 *          engine omits it [0,3,7,10,14,21] (6-note, omit 11)
 */
const KNOWN_DIFFERENCES: Record<
  string,
  { curriculum: number[]; engine: number[] }
> = {
  min13: {
    curriculum: [0, 3, 7, 10, 14, 17, 21],
    engine: [0, 3, 7, 10, 14, 21],
  },
};

describe('Chord interval consistency', () => {
  describe('overlapping chords: curriculum intervals match engine intervals', () => {
    for (const [currId, engineId] of Object.entries(
      CURRICULUM_TO_ENGINE_CHORD,
    )) {
      // Skip slash chords — they have different interval representations
      // (engine uses negative numbers for bass inversions)
      if (currId.startsWith('maj_over')) continue;

      if (currId in KNOWN_DIFFERENCES) {
        it(`${currId} → ${engineId} (known difference — documented)`, () => {
          const currIntervals = CURRICULUM_CHORD_INTERVALS[currId];
          const engineIntervals = CHORDS[engineId];
          expect(currIntervals).toEqual(KNOWN_DIFFERENCES[currId].curriculum);
          expect(engineIntervals).toEqual(KNOWN_DIFFERENCES[currId].engine);
        });
        continue;
      }

      it(`${currId} → ${engineId}`, () => {
        const currIntervals = CURRICULUM_CHORD_INTERVALS[currId];
        const engineIntervals = CHORDS[engineId];

        expect(currIntervals).toBeDefined();
        expect(engineIntervals).toBeDefined();
        expect(currIntervals).toEqual(engineIntervals);
      });
    }
  });

  describe('getChordIntervals() bridge function', () => {
    it('returns engine intervals for mapped curriculum IDs', () => {
      expect(getChordIntervals('maj')).toEqual([0, 4, 7]);
      expect(getChordIntervals('dom7')).toEqual([0, 4, 7, 10]);
      expect(getChordIntervals('min7')).toEqual([0, 3, 7, 10]);
    });

    it('returns undefined for curriculum-only chords not yet in engine', () => {
      // dom11 is in CURRICULUM_ONLY_CHORDS — not in engine
      expect(getChordIntervals('dom11')).toBeUndefined();
    });
  });

  describe('CURRICULUM_ONLY_CHORDS are not in engine', () => {
    for (const chordId of CURRICULUM_ONLY_CHORDS) {
      it(`${chordId} has no engine equivalent`, () => {
        expect(CHORDS[chordId]).toBeUndefined();
      });
    }
  });

  describe('ENGINE_ONLY_CHORDS are in engine but not in curriculum map', () => {
    for (const chordId of ENGINE_ONLY_CHORDS) {
      it(`${chordId} exists in engine CHORDS`, () => {
        expect(CHORDS[chordId]).toBeDefined();
      });
    }
  });

  describe('every mapped engine chord exists in CHORDS', () => {
    for (const [, engineId] of Object.entries(CURRICULUM_TO_ENGINE_CHORD)) {
      it(`engine chord "${engineId}" exists`, () => {
        expect(CHORDS[engineId]).toBeDefined();
      });
    }
  });
});
