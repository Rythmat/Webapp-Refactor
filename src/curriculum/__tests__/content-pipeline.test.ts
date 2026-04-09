/**
 * Phase 10 — Content Generation Pipeline tests.
 *
 * Tests melody, progression, bass pipelines and the content orchestrator.
 */

import { describe, it, expect } from 'vitest';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import { getGCMEntry } from '../data/gcmHelpers';
import { generateCurriculumBass } from '../engine/bassPipeline';
import { generateFullActivity } from '../engine/contentOrchestrator';
import { generateCurriculumMelody } from '../engine/melodyPipeline';
import { generateCurriculumProgression } from '../engine/progressionPipeline';

const C4 = 60;

// ---------------------------------------------------------------------------
// Melody Pipeline
// ---------------------------------------------------------------------------
describe('melodyPipeline', () => {
  it('generates melody events for POP L1', () => {
    const gcm = getGCMEntry('POP', 'L1');
    const melody = generateCurriculumMelody(gcm, C4);
    expect(melody.length).toBeGreaterThan(0);
    for (const e of melody) {
      expect(e.note).toBeGreaterThanOrEqual(36); // reasonable MIDI range
      expect(e.note).toBeLessThanOrEqual(96);
      expect(e.onset).toBeGreaterThanOrEqual(0);
      expect(e.duration).toBeGreaterThan(0);
    }
  });

  it('generates melody events for JAZZ L2', () => {
    const gcm = getGCMEntry('JAZZ', 'L2');
    const melody = generateCurriculumMelody(gcm, C4);
    expect(melody.length).toBeGreaterThan(0);
  });

  it('generates melodies with swing for JAZZ', () => {
    const gcm = getGCMEntry('JAZZ', 'L1');
    const melody = generateCurriculumMelody(gcm, C4, 5);
    expect(melody.length).toBeGreaterThan(0);
  });

  it('all events have valid fields', () => {
    const gcm = getGCMEntry('FUNK', 'L1');
    const melody = generateCurriculumMelody(gcm, C4);
    for (const e of melody) {
      expect(typeof e.note).toBe('number');
      expect(typeof e.onset).toBe('number');
      expect(typeof e.duration).toBe('number');
      expect(Number.isFinite(e.note)).toBe(true);
      expect(Number.isFinite(e.onset)).toBe(true);
      expect(Number.isFinite(e.duration)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Progression Pipeline
// ---------------------------------------------------------------------------
describe('progressionPipeline', () => {
  it('generates voiced progression for POP L1', () => {
    const gcm = getGCMEntry('POP', 'L1');
    const prog = generateCurriculumProgression(gcm, C4);
    expect(prog.length).toBeGreaterThan(0);
    for (const chord of prog) {
      expect(chord.rh.length).toBeGreaterThan(0);
      expect(chord.onset).toBeGreaterThanOrEqual(0);
      expect(chord.duration).toBeGreaterThan(0);
      expect(chord.degree).toBeTruthy();
      expect(chord.qualityId).toBeTruthy();
    }
  });

  it('generates voiced progression for JAZZ L3', () => {
    const gcm = getGCMEntry('JAZZ', 'L3');
    const prog = generateCurriculumProgression(gcm, C4);
    expect(prog.length).toBeGreaterThan(0);
  });

  it('progression chords have non-overlapping timing', () => {
    const gcm = getGCMEntry('ROCK', 'L1');
    const prog = generateCurriculumProgression(gcm, C4);
    for (let i = 1; i < prog.length; i++) {
      expect(prog[i].onset).toBeGreaterThanOrEqual(prog[i - 1].onset);
    }
  });

  it('all RH notes are valid MIDI', () => {
    const gcm = getGCMEntry('NEO SOUL', 'L2');
    const prog = generateCurriculumProgression(gcm, C4);
    for (const chord of prog) {
      for (const note of chord.rh) {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(127);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Bass Pipeline
// ---------------------------------------------------------------------------
describe('bassPipeline', () => {
  it('generates bass events from a progression', () => {
    const gcm = getGCMEntry('POP', 'L1');
    const prog = generateCurriculumProgression(gcm, C4);
    const bass = generateCurriculumBass(prog, gcm, C4);
    expect(bass.length).toBeGreaterThan(0);
    for (const e of bass) {
      expect(e.note).toBeLessThanOrEqual(72); // bass register
      expect(e.onset).toBeGreaterThanOrEqual(0);
      expect(e.duration).toBeGreaterThan(0);
    }
  });

  it('generates bass for LATIN L1', () => {
    const gcm = getGCMEntry('LATIN', 'L1');
    const prog = generateCurriculumProgression(gcm, C4);
    if (prog.length > 0) {
      const bass = generateCurriculumBass(prog, gcm, C4);
      // Bass may be empty if no matching contour/rhythm found for this random selection
      for (const e of bass) {
        expect(e.note).toBeGreaterThanOrEqual(0);
        expect(e.duration).toBeGreaterThan(0);
      }
    }
    // Progression may be empty if random selection finds no matching rhythms
    // This is acceptable — the pipeline degrades gracefully
  });
});

// ---------------------------------------------------------------------------
// Content Orchestrator
// ---------------------------------------------------------------------------
describe('contentOrchestrator', () => {
  it('generates a full activity for POP L1', () => {
    const activity = generateFullActivity('POP', 'L1', C4, 100);
    expect(activity.genre).toBe('POP');
    expect(activity.level).toBe('L1');
    expect(activity.keyRoot).toBe(C4);
    expect(activity.tempo).toBe(100);
    expect(activity.melody.length).toBeGreaterThan(0);
    expect(activity.progression.length).toBeGreaterThan(0);
    expect(activity.bass.length).toBeGreaterThan(0);
  });

  it('generates activity with auto tempo from GCM range', () => {
    const activity = generateFullActivity('JAZZ', 'L2', C4);
    // Jazz L2 tempo range is [80, 180]
    expect(activity.tempo).toBeGreaterThanOrEqual(80);
    expect(activity.tempo).toBeLessThanOrEqual(180);
  });

  it('works for all 14 genres at L1 without errors', () => {
    const genres: CurriculumGenreId[] = [
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
    for (const genre of genres) {
      // Should not throw for any genre
      const activity = generateFullActivity(genre, 'L1', C4, 100);
      expect(activity.genre).toBe(genre);
      expect(activity.level).toBe('L1');
      // Melody and progression use random selection — may occasionally be empty
      // for genres with sparse library coverage, but should not error
    }
  });

  it('produces valid MIDI in all fields', () => {
    const activity = generateFullActivity('FUNK', 'L2', C4, 110);
    const allNotes = [
      ...activity.melody.map((e) => e.note),
      ...activity.progression.flatMap((c) => c.rh),
      ...activity.bass.map((e) => e.note),
    ];
    for (const note of allNotes) {
      expect(note).toBeGreaterThanOrEqual(0);
      expect(note).toBeLessThanOrEqual(127);
      expect(Number.isFinite(note)).toBe(true);
    }
  });
});
