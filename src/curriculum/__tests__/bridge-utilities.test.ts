/**
 * Phase 4 — Bridge utility validation.
 *
 * Tests scaleBridge and resolveInKey functions for correctness.
 */

import { describe, it, expect } from 'vitest';
import {
  degreeToSemitone,
  parseDegree,
  resolveInKey,
  resolveChordToMidi,
  resolveDegreeToMidi,
  resolveProgression,
} from '../bridge/resolveInKey';
import {
  parseScaleString,
  lookupScaleIntervals,
  isDiatonic,
} from '../bridge/scaleBridge';

describe('scaleBridge', () => {
  describe('parseScaleString', () => {
    it('parses "name = [intervals]" format', () => {
      const result = parseScaleString('major_pentatonic = [0, 2, 4, 7, 9]');
      expect(result.name).toBe('major_pentatonic');
      expect(result.intervals).toEqual([0, 2, 4, 7, 9]);
    });

    it('parses "[intervals]" only format', () => {
      const result = parseScaleString('[0, 3, 5, 7, 10]');
      expect(result.name).toBe('custom');
      expect(result.intervals).toEqual([0, 3, 5, 7, 10]);
    });

    it('parses name-only format for known engine scales', () => {
      const result = parseScaleString('ionian');
      expect(result.name).toBe('ionian');
      expect(result.intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it('throws for unknown name-only format', () => {
      expect(() => parseScaleString('nonexistent_scale')).toThrow();
    });
  });

  describe('lookupScaleIntervals', () => {
    it('resolves curriculum scale names to engine intervals', () => {
      expect(lookupScaleIntervals('ionian')).toEqual([0, 2, 4, 5, 7, 9, 11]);
      expect(lookupScaleIntervals('dorian')).toEqual([0, 2, 3, 5, 7, 9, 10]);
      expect(lookupScaleIntervals('aeolian')).toEqual([0, 2, 3, 5, 7, 8, 10]);
    });

    it('returns undefined for scales not yet in engine', () => {
      // These will be added in Phase 6C
      // For now they may or may not be in ALL_MODES
      const result = lookupScaleIntervals('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('isDiatonic', () => {
    it('returns true for 7-note scales', () => {
      expect(isDiatonic([0, 2, 4, 5, 7, 9, 11])).toBe(true);
    });

    it('returns false for pentatonic (5 notes)', () => {
      expect(isDiatonic([0, 2, 4, 7, 9])).toBe(false);
    });

    it('returns false for blues (6 notes)', () => {
      expect(isDiatonic([0, 3, 5, 6, 7, 10])).toBe(false);
    });
  });
});

describe('resolveInKey', () => {
  describe('degreeToSemitone (Chromatic MIDI Mapping)', () => {
    it('maps natural degrees correctly', () => {
      expect(degreeToSemitone('1')).toBe(0);
      expect(degreeToSemitone('2')).toBe(2);
      expect(degreeToSemitone('3')).toBe(4);
      expect(degreeToSemitone('4')).toBe(5);
      expect(degreeToSemitone('5')).toBe(7);
      expect(degreeToSemitone('6')).toBe(9);
      expect(degreeToSemitone('7')).toBe(11);
    });

    it('maps flat degrees correctly', () => {
      expect(degreeToSemitone('b2')).toBe(1);
      expect(degreeToSemitone('b3')).toBe(3);
      expect(degreeToSemitone('b5')).toBe(6);
      expect(degreeToSemitone('b7')).toBe(10);
      expect(degreeToSemitone('b9')).toBe(13);
    });

    it('maps sharp degrees correctly', () => {
      expect(degreeToSemitone('#2')).toBe(3);
      expect(degreeToSemitone('#4')).toBe(6);
      expect(degreeToSemitone('#5')).toBe(8);
      expect(degreeToSemitone('#9')).toBe(15);
      expect(degreeToSemitone('#11')).toBe(18);
    });

    it('maps compound intervals correctly', () => {
      expect(degreeToSemitone('8')).toBe(12);
      expect(degreeToSemitone('9')).toBe(14);
      expect(degreeToSemitone('11')).toBe(17);
      expect(degreeToSemitone('13')).toBe(21);
    });
  });

  describe('parseDegree', () => {
    it('parses natural degrees', () => {
      expect(parseDegree('1')).toEqual({ modifier: 0, degree: 1 });
      expect(parseDegree('5')).toEqual({ modifier: 0, degree: 5 });
    });

    it('parses flat degrees', () => {
      expect(parseDegree('b3')).toEqual({ modifier: -1, degree: 3 });
      expect(parseDegree('b7')).toEqual({ modifier: -1, degree: 7 });
    });

    it('parses sharp degrees', () => {
      expect(parseDegree('#4')).toEqual({ modifier: 1, degree: 4 });
      expect(parseDegree('#5')).toEqual({ modifier: 1, degree: 5 });
    });
  });

  describe('resolveInKey', () => {
    // C4 = MIDI 60
    const C4 = 60;

    it('resolves "1 major" in C → C major chord [60, 64, 67]', () => {
      const result = resolveInKey('1', 'major', C4);
      expect(result).toBeDefined();
      expect(result!.root).toBe(60);
      expect(result!.intervals).toEqual([0, 4, 7]);
    });

    it('resolves "5 dominant7" in C → G dominant7 [67, 71, 74, 77]', () => {
      const result = resolveInKey('5', 'dominant7', C4);
      expect(result).toBeDefined();
      expect(result!.root).toBe(67); // G
      expect(result!.intervals).toEqual([0, 4, 7, 10]);
    });

    it('resolves curriculum chord IDs via translation', () => {
      const result = resolveInKey('1', 'maj', C4);
      expect(result).toBeDefined();
      expect(result!.intervals).toEqual([0, 4, 7]);
    });

    it('resolves "b3 minor7" in C → Eb minor7', () => {
      const result = resolveInKey('b3', 'minor7', C4);
      expect(result).toBeDefined();
      expect(result!.root).toBe(63); // Eb
    });

    it('returns undefined for unknown quality', () => {
      const result = resolveInKey('1', 'nonexistent_chord', C4);
      expect(result).toBeUndefined();
    });
  });

  describe('resolveChordToMidi', () => {
    it('resolves "1 major" to MIDI notes', () => {
      const result = resolveChordToMidi('1 major', 60);
      expect(result).toEqual([60, 64, 67]);
    });

    it('resolves "b7 dominant7" to MIDI notes', () => {
      const result = resolveChordToMidi('b7 dominant7', 60);
      expect(result).toBeDefined();
      expect(result![0]).toBe(70); // Bb
    });
  });

  describe('resolveDegreeToMidi', () => {
    it('resolves degree 1 in C to MIDI 60', () => {
      expect(resolveDegreeToMidi('1', 60)).toBe(60);
    });

    it('resolves degree 5 in C to MIDI 67 (G)', () => {
      expect(resolveDegreeToMidi('5', 60)).toBe(67);
    });

    it('resolves b3 in C to MIDI 63 (Eb)', () => {
      expect(resolveDegreeToMidi('b3', 60)).toBe(63);
    });
  });

  describe('resolveProgression', () => {
    it('resolves a I-IV-V-I progression in C', () => {
      const result = resolveProgression(
        '1 major - 4 major - 5 dominant7 - 1 major',
        60,
      );
      expect(result).toHaveLength(4);
      expect(result[0].root).toBe(60); // C
      expect(result[1].root).toBe(65); // F
      expect(result[2].root).toBe(67); // G
      expect(result[3].root).toBe(60); // C
      expect(result[2].intervals).toEqual([0, 4, 7, 10]); // dom7
    });

    it('resolves a ii-V-I in C', () => {
      const result = resolveProgression(
        '2 minor7 - 5 dominant7 - 1 major7',
        60,
      );
      expect(result).toHaveLength(3);
      expect(result[0].root).toBe(62); // D
      expect(result[0].intervals).toEqual([0, 3, 7, 10]); // min7
      expect(result[1].root).toBe(67); // G
      expect(result[2].root).toBe(60); // C
    });
  });
});
