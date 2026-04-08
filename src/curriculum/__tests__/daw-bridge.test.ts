/**
 * Phase 21 — DAW Bridge Tests.
 */

import { describe, it, expect } from 'vitest';
import { curriculumToDaw, dawToCurriculumContext } from '../bridge/dawBridge';
import { generateFullActivity } from '../engine/contentOrchestrator';

const C4 = 60;

describe('dawBridge', () => {
  describe('curriculumToDaw', () => {
    it('converts a generated activity to DAW payload', () => {
      const activity = generateFullActivity('POP', 'L1', C4, 120);
      const payload = curriculumToDaw(activity);

      expect(payload.rootNote).toBe(0); // C = 0
      expect(payload.bpm).toBe(120);
      expect(payload.genre).toBe('Pop');
      expect(payload.swing).toBe(activity.swing);
      expect(payload.melodyEvents).toBe(activity.melody);
      expect(payload.bassEvents).toBe(activity.bass);
    });

    it('creates chord regions with valid timing', () => {
      const activity = generateFullActivity('JAZZ', 'L2', C4, 140);
      const payload = curriculumToDaw(activity);

      for (const region of payload.chordRegions) {
        expect(region.startTick).toBeGreaterThanOrEqual(0);
        expect(region.endTick).toBeGreaterThan(region.startTick);
        expect(region.name).toBeTruthy();
        expect(region.id).toBeTruthy();
        expect(region.color).toHaveLength(3);
        // Color values should be 0-255
        for (const c of region.color) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(255);
        }
      }
    });

    it('maps root note correctly for non-C keys', () => {
      // D4 = MIDI 62, pitch class = 2
      const activity = generateFullActivity('ROCK', 'L1', 62, 100);
      const payload = curriculumToDaw(activity);
      expect(payload.rootNote).toBe(2); // D = 2
    });

    it('chord regions have unique IDs', () => {
      const activity = generateFullActivity('FUNK', 'L1', C4, 100);
      const payload = curriculumToDaw(activity);
      const ids = payload.chordRegions.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('dawToCurriculumContext', () => {
    it('converts DAW state to curriculum context', () => {
      const ctx = dawToCurriculumContext(0, 120, 'Pop', 4);
      expect(ctx.keyRoot).toBe(60); // C4
      expect(ctx.tempo).toBe(120);
      expect(ctx.genre).toBe('POP');
      expect(ctx.chordCount).toBe(4);
    });

    it('handles null root note', () => {
      const ctx = dawToCurriculumContext(null, 100, 'Jazz', 0);
      expect(ctx.keyRoot).toBe(60); // default C4
      expect(ctx.genre).toBe(null);
    });

    it('maps engine genre to curriculum genre', () => {
      const ctx = dawToCurriculumContext(0, 120, 'Hip Hop', 2);
      expect(ctx.genre).toBe('HIP HOP');
    });
  });
});
