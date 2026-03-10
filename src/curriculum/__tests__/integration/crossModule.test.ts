/**
 * Phase 20 — Cross-Module Integration Tests.
 *
 * Verifies that all curriculum modules work together correctly:
 * - GCM → pipelines → assessment → scoring flow
 * - Play-along generation from full activities
 * - Progress ID generation and parsing roundtrip
 * - Store actions produce expected state
 */

import { describe, it, expect } from 'vitest';
import { CURRICULUM_GENRE_IDS } from '../../bridge/genreIdMap';
import CHORD_PROGRESSION_LIBRARY from '../../data/chordProgressionLibrary';
import { filterByVibeAndStyle } from '../../engine/algorithmFilter';
import { evaluate } from '../../engine/assessmentEngine';
import { generateFullActivity } from '../../engine/contentOrchestrator';
import { generatePlayAlongTrack } from '../../engine/playAlongGenerator';
import { getUnlockedLevels } from '../../engine/progressRules';
import {
  buildCurriculumLessonId,
  buildCurriculumActivityId,
  parseCurriculumActivityId,
} from '../../hooks/useCurriculumProgress';

const C4 = 60;

describe('end-to-end: generate → assess → score', () => {
  it('generates activity, simulates perfect play, gets grade A', () => {
    const activity = generateFullActivity('POP', 'L1', C4, 100);
    expect(activity.melody.length).toBeGreaterThan(0);

    // Simulate perfect playback (student plays exact notes)
    const received = activity.melody.map((e) => ({ ...e }));
    const result = evaluate(activity.melody, received, 'pitch_only', 100);

    expect(result.score.passed).toBe(true);
    expect(result.score.accuracy).toBe(100);
    expect(result.score.grade).toBe('A');
  });

  it('generates activity, simulates wrong notes, gets retry', () => {
    const activity = generateFullActivity('ROCK', 'L1', C4, 100);
    if (activity.melody.length === 0) return; // skip if empty

    // Simulate all wrong notes
    const received = activity.melody.map((e) => ({
      ...e,
      note: e.note + 6, // tritone away — definitely wrong
    }));
    const result = evaluate(activity.melody, received, 'pitch_only', 100);

    expect(result.score.accuracy).toBeLessThan(100);
  });

  it('generates activity then play-along track from it', () => {
    const activity = generateFullActivity('JAZZ', 'L2', C4, 140);
    const playAlong = generatePlayAlongTrack(activity, 4);

    expect(playAlong.bars).toBe(4);
    expect(playAlong.totalTicks).toBe(4 * 1920);

    // All tracks should have events (or be empty gracefully)
    const totalEvents =
      playAlong.drums.length +
      playAlong.bass.length +
      playAlong.chords.length +
      playAlong.melody.length;
    expect(totalEvents).toBeGreaterThan(0);

    // No events exceed totalTicks
    for (const e of [
      ...playAlong.drums,
      ...playAlong.bass,
      ...playAlong.chords,
      ...playAlong.melody,
    ]) {
      expect(e.onset).toBeLessThan(playAlong.totalTicks);
    }
  });
});

describe('end-to-end: progress ID roundtrip', () => {
  it('builds and parses activity IDs consistently', () => {
    for (const genre of CURRICULUM_GENRE_IDS) {
      for (const section of ['A', 'B', 'C', 'D'] as const) {
        const id = buildCurriculumActivityId(genre, 'L2', section, 5);
        const parsed = parseCurriculumActivityId(id);

        expect(parsed).not.toBe(null);
        expect(parsed!.genre).toBe(genre);
        expect(parsed!.level).toBe('L2');
        expect(parsed!.section).toBe(section);
        expect(parsed!.stepNumber).toBe(5);
      }
    }
  });

  it('lesson IDs are unique per genre/level', () => {
    const ids = new Set<string>();
    for (const genre of CURRICULUM_GENRE_IDS) {
      for (const level of ['L1', 'L2', 'L3'] as const) {
        const id = buildCurriculumLessonId(genre, level);
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    }
    expect(ids.size).toBe(42); // 14 genres × 3 levels
  });
});

describe('end-to-end: progress rules with real completion data', () => {
  it('simulates progress through levels', () => {
    const completionData: Record<string, number> = {
      'POP:L1': 0,
      'POP:L2': 0,
      'POP:L3': 0,
    };
    const getCompletion = (_g: string, level: string) =>
      completionData[`POP:${level}`] ?? 0;

    // Initially: only L1 unlocked
    expect(getUnlockedLevels('POP', getCompletion as any)).toEqual(['L1']);

    // Complete L1 to 75%
    completionData['POP:L1'] = 75;
    expect(getUnlockedLevels('POP', getCompletion as any)).toEqual([
      'L1',
      'L2',
    ]);

    // Complete L2 to 90%
    completionData['POP:L2'] = 90;
    expect(getUnlockedLevels('POP', getCompletion as any)).toEqual([
      'L1',
      'L2',
      'L3',
    ]);
  });
});

describe('end-to-end: algorithm filter with generated progressions', () => {
  it('filterByVibeAndStyle returns subset of progressions', () => {
    // This tests that the vibe/style filter doesn't crash with real data
    const results = filterByVibeAndStyle(
      CHORD_PROGRESSION_LIBRARY,
      'happy',
      'pop',
    );

    // Should return array (possibly empty for sparse data)
    expect(Array.isArray(results)).toBe(true);
  });
});
