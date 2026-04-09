/**
 * Phases 21-30 — Platform Integration Tests.
 *
 * Tests DAW bridge, Atlas bridge, learn cross-links, placement scoring,
 * adaptive difficulty, instrument map, lead sheet bridge, and audio bridge.
 */

import { describe, it, expect } from 'vitest';
// Phase 21 — DAW Bridge
import {
  getGenresForRegion,
  getAtlasMetadata,
  getRegionsWithCurriculum,
  regionHasCurriculum,
} from '../bridge/atlasBridge';
// Phase 22 — Atlas Bridge
// Phase 26 — Placement
import { CURRICULUM_GENRE_IDS } from '../bridge/genreIdMap';
import { curriculumToLeadSheet } from '../bridge/leadSheetBridge';
import {
  getGenresForMode,
  getModesForGenreLevel,
  getAllLinkedModes,
} from '../bridge/learnCurriculumLinks';
// Phase 27 — Learn cross-links
// Phase 28 — Lead Sheet
// Phase 29 — Adaptive difficulty
import {
  getAdaptedParams,
  buildPerformanceHistory,
} from '../engine/adaptiveDifficulty';
// Phase 30 — Instrument map
import { generateFullActivity } from '../engine/contentOrchestrator';
import { getGenreInstruments } from '../engine/instrumentMap';
// Shared
import { scorePlacement } from '../engine/placementScoring';

const C4 = 60;

// ---------------------------------------------------------------------------
// Phase 22 — Atlas Bridge
// ---------------------------------------------------------------------------

describe('atlasBridge', () => {
  it('returns genres for north-america region', () => {
    const genres = getGenresForRegion('north-america');
    expect(genres.length).toBeGreaterThan(0);
    expect(genres.some((g) => g.genre === 'JAZZ')).toBe(true);
    expect(genres.some((g) => g.genre === 'BLUES')).toBe(true);
  });

  it('returns metadata for each curriculum genre', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      const meta = getAtlasMetadata(genre);
      expect(meta).toBeDefined();
      expect(meta!.region).toBeTruthy();
      expect(meta!.culturalContext).toBeTruthy();
    }
  });

  it('getRegionsWithCurriculum returns at least 3 regions', () => {
    const regions = getRegionsWithCurriculum();
    expect(regions.length).toBeGreaterThanOrEqual(3);
  });

  it('regionHasCurriculum returns true for known regions', () => {
    expect(regionHasCurriculum('north-america')).toBe(true);
    expect(regionHasCurriculum('caribbean')).toBe(true);
    expect(regionHasCurriculum('west-africa')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 26 — Placement
// ---------------------------------------------------------------------------

describe('placementScoring', () => {
  it('recommends L2 for advanced students', () => {
    const result = scorePlacement(['JAZZ', 'FUNK'], {
      melodyPassed: true,
      chordsPassed: true,
      melodyAccuracy: 95,
      chordsAccuracy: 90,
    });

    expect(result.startingLevel).toBe('L2');
    expect(result.isAdvanced).toBe(true);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toEqual({ genre: 'JAZZ', level: 'L2' });
  });

  it('recommends L1 for beginners', () => {
    const result = scorePlacement(['POP', 'ROCK'], {
      melodyPassed: false,
      chordsPassed: false,
      melodyAccuracy: 40,
      chordsAccuracy: 30,
    });

    expect(result.startingLevel).toBe('L1');
    expect(result.isAdvanced).toBe(false);
    expect(result.recommendations[0].level).toBe('L1');
  });

  it('requires both melody and chords passed for L2', () => {
    const result = scorePlacement(['JAZZ'], {
      melodyPassed: true,
      chordsPassed: false,
      melodyAccuracy: 90,
      chordsAccuracy: 50,
    });

    expect(result.startingLevel).toBe('L1');
  });
});

// ---------------------------------------------------------------------------
// Phase 27 — Learn cross-links
// ---------------------------------------------------------------------------

describe('learnCurriculumLinks', () => {
  it('returns genres for dorian mode', () => {
    const genres = getGenresForMode('dorian');
    expect(genres.length).toBeGreaterThan(0);
    expect(genres.some((g) => g.genre === 'JAZZ')).toBe(true);
  });

  it('returns modes for JAZZ L1', () => {
    const modes = getModesForGenreLevel('JAZZ', 'L1');
    expect(modes.length).toBeGreaterThan(0);
    expect(modes.some((m) => m.mode === 'dorian')).toBe(true);
  });

  it('getAllLinkedModes returns known modes', () => {
    const modes = getAllLinkedModes();
    expect(modes).toContain('ionian');
    expect(modes).toContain('dorian');
    expect(modes).toContain('mixolydian');
    expect(modes).toContain('blues');
  });

  it('returns empty for unknown mode', () => {
    expect(getGenresForMode('nonexistent')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 28 — Lead Sheet Bridge
// ---------------------------------------------------------------------------

describe('leadSheetBridge', () => {
  it('converts activity to lead sheet data', () => {
    const activity = generateFullActivity('POP', 'L1', C4, 120);
    const leadSheet = curriculumToLeadSheet(activity);

    expect(leadSheet.title).toBe('POP L1');
    expect(leadSheet.keyName).toBe('C Major');
    expect(leadSheet.tempo).toBe(120);
    expect(leadSheet.timeSignature).toBe('4/4');
    expect(leadSheet.sections.length).toBeGreaterThan(0);
    expect(leadSheet.totalTicks).toBeGreaterThan(0);
  });

  it('chords have valid names', () => {
    const activity = generateFullActivity('JAZZ', 'L2', C4, 140);
    const leadSheet = curriculumToLeadSheet(activity);

    for (const section of leadSheet.sections) {
      for (const chord of section.chords) {
        expect(chord.name).toBeTruthy();
        expect(chord.endTick).toBeGreaterThan(chord.startTick);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 29 — Adaptive difficulty
// ---------------------------------------------------------------------------

describe('adaptiveDifficulty', () => {
  it('returns simplified for struggling student', () => {
    const history = buildPerformanceHistory([
      {
        accuracy: 50,
        grade: 'retry',
        passed: false,
        correctCount: 2,
        totalExpected: 4,
      },
      {
        accuracy: 55,
        grade: 'retry',
        passed: false,
        correctCount: 2,
        totalExpected: 4,
      },
      {
        accuracy: 45,
        grade: 'retry',
        passed: false,
        correctCount: 1,
        totalExpected: 4,
      },
    ]);

    const params = getAdaptedParams(history);
    expect(params.tier).toBe('simplified');
    expect(params.timingToleranceMs).toBe(300);
    expect(params.contourNotesOverride).toEqual([3]);
  });

  it('returns challenge for proficient student', () => {
    const history = buildPerformanceHistory([
      {
        accuracy: 95,
        grade: 'A',
        passed: true,
        correctCount: 4,
        totalExpected: 4,
      },
      {
        accuracy: 92,
        grade: 'A',
        passed: true,
        correctCount: 4,
        totalExpected: 4,
      },
      {
        accuracy: 98,
        grade: 'A',
        passed: true,
        correctCount: 4,
        totalExpected: 4,
      },
    ]);

    const params = getAdaptedParams(history);
    expect(params.tier).toBe('challenge');
    expect(params.timingToleranceMs).toBe(150);
  });

  it('returns normal for average student', () => {
    const history = buildPerformanceHistory([
      {
        accuracy: 75,
        grade: 'C',
        passed: true,
        correctCount: 3,
        totalExpected: 4,
      },
      {
        accuracy: 80,
        grade: 'B',
        passed: true,
        correctCount: 3,
        totalExpected: 4,
      },
    ]);

    const params = getAdaptedParams(history);
    expect(params.tier).toBe('normal');
    expect(params.timingToleranceMs).toBe(200);
  });

  it('detects improving trend', () => {
    const history = buildPerformanceHistory([
      {
        accuracy: 90,
        grade: 'A',
        passed: true,
        correctCount: 4,
        totalExpected: 4,
      },
      {
        accuracy: 70,
        grade: 'C',
        passed: true,
        correctCount: 3,
        totalExpected: 4,
      },
    ]);

    expect(history.trend).toBe('improving');
  });
});

// ---------------------------------------------------------------------------
// Phase 30 — Instrument map
// ---------------------------------------------------------------------------

describe('instrumentMap', () => {
  it('has instruments for all 14 genres', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      const instruments = getGenreInstruments(genre);
      expect(instruments).toBeDefined();
      expect(instruments.chords).toBeDefined();
      expect(instruments.bass).toBeDefined();
      expect(instruments.melody).toBeDefined();
      expect(instruments.description).toBeTruthy();
    }
  });

  it('instrument configs have valid values', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      const instruments = getGenreInstruments(genre);
      for (const config of [
        instruments.chords,
        instruments.bass,
        instruments.melody,
      ]) {
        expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(
          config.oscillator,
        );
        expect(config.attack).toBeGreaterThan(0);
        expect(config.sustain).toBeGreaterThanOrEqual(0);
        expect(config.sustain).toBeLessThanOrEqual(1);
      }
    }
  });
});
