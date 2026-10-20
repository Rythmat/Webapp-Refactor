import { describe, expect, it } from 'vitest';
import CURATED_FILE from '@/curriculum/data/echo/echoContours.json';
import { pitchClassOf } from '../../musicLiteracy/pitch';
import { melodyCall } from '../calls';
import {
  CONTOUR_LIBRARY,
  ECHO_CONTOURS,
  PAD_WINDOW,
  contourMotion,
  contourPositions,
  contoursOfLevel,
  fitsWindow,
  levelContours,
  levelSpan,
  libraryContour,
  positionSemitones,
  zeroPointsFor,
} from '../contours';
import { ECHO_LEVELS, ECHO_LEVEL_NUMBERS } from '../levels';
import { echoRandom } from '../random';

/**
 * The contour library, the starter set chosen from it, and the owner's
 * zero point rule: the zero point shifts every value, negatives included,
 * and a position resolves through the scale as scale[p mod 7] + 12 ×
 * floor(p / 7).
 */

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const names = (midis: readonly number[]) =>
  midis.map((midi) => NAMES[midi % 12]);

describe('the zero point', () => {
  const C_MAJOR = { tonic: 'C', mode: 'major' } as const;
  const call = (
    zeroPoint: 1 | 3 | 5,
    key: Parameters<typeof melodyCall>[1] = C_MAJOR,
  ) =>
    melodyCall(2, key, echoRandom(zeroPoint), {
      contourId: '-1,0,1',
      zeroPoint,
    });

  it('shifts every value, negatives too: the owner’s C major example', () => {
    expect(names(call(1).notes.map((n) => n.midi))).toEqual(['B', 'C', 'D']);
    expect(names(call(3).notes.map((n) => n.midi))).toEqual(['D', 'E', 'F']);
    expect(names(call(5).notes.map((n) => n.midi))).toEqual(['F', 'G', 'A']);
    expect(contourPositions([-1, 0, 1], 3)).toEqual([1, 2, 3]);
    expect(contourPositions([-1, 0, 1], 5)).toEqual([3, 4, 5]);
  });

  it('labels the notes as scale degrees, minor’s flats shown', () => {
    expect(call(1).notes.map((n) => n.label)).toEqual(['7', '1', '2']);
    const cMinor = { tonic: 'C', mode: 'minor' } as const;
    expect(call(3, cMinor).notes.map((n) => n.label)).toEqual(['2', '♭3', '4']);
    expect(names(call(3, cMinor).notes.map((n) => n.midi))).toEqual([
      'D',
      'E♭',
      'F',
    ]);
    expect(call(5, cMinor).notes.map((n) => n.label)).toEqual(['4', '5', '♭6']);
  });

  it('works the same in a minor key: A minor', () => {
    const aMinor = { tonic: 'A', mode: 'minor' } as const;
    expect(names(call(1, aMinor).notes.map((n) => n.midi))).toEqual([
      'G',
      'A',
      'B',
    ]);
    expect(names(call(3, aMinor).notes.map((n) => n.midi))).toEqual([
      'B',
      'C',
      'D',
    ]);
    expect(names(call(5, aMinor).notes.map((n) => n.midi))).toEqual([
      'D',
      'E',
      'F',
    ]);
  });

  it('steps through the scale, a note of it per value', () => {
    const notes = call(1).notes;
    // B up to C is a half step, C up to D a whole one.
    expect(notes[1].midi - notes[0].midi).toBe(1);
    expect(notes[2].midi - notes[1].midi).toBe(2);
  });
});

describe('a position in the scale', () => {
  it('resolves beyond the octave', () => {
    expect(positionSemitones(7, 'major')).toBe(12);
    expect(positionSemitones(8, 'major')).toBe(14);
    expect(positionSemitones(11, 'major')).toBe(19);
    expect(positionSemitones(9, 'minor')).toBe(15);
    expect(positionSemitones(14, 'minor')).toBe(24);
  });

  it('resolves below the root', () => {
    expect(positionSemitones(-1, 'major')).toBe(-1); // the 7 below
    expect(positionSemitones(-3, 'major')).toBe(-5); // the 5 below
    expect(positionSemitones(-7, 'major')).toBe(-12);
    expect(positionSemitones(-8, 'major')).toBe(-13);
    expect(positionSemitones(-1, 'minor')).toBe(-2); // the ♭7 below
    expect(positionSemitones(-2, 'minor')).toBe(-4); // the ♭6 below
  });

  it('places a call that climbs past the octave', () => {
    const c = melodyCall(2, { tonic: 'C', mode: 'major' }, echoRandom(1), {
      contourId: '0,2,4,6,7',
      zeroPoint: 5,
    });
    expect(c.notes.map((n) => n.position)).toEqual([4, 6, 8, 10, 11]);
    expect(c.notes.map((n) => n.midi - c.tonic)).toEqual([7, 11, 14, 17, 19]);
    expect(names(c.notes.map((n) => n.midi))).toEqual([
      'G',
      'B',
      'D',
      'F',
      'G',
    ]);
    expect(c.notes.map((n) => n.label)).toEqual(['5', '7', '2', '4', '5']);
  });

  it('places a call that dips below the 1', () => {
    const c = melodyCall(1, { tonic: 'D', mode: 'major' }, echoRandom(1), {
      contourId: '-3,-2,-1,0',
    });
    expect(c.notes.map((n) => n.midi - c.tonic)).toEqual([-5, -3, -1, 0]);
    expect(names(c.notes.map((n) => n.midi))).toEqual(['A', 'B', 'C♯', 'D']);
    expect(c.tonic % 12).toBe(pitchClassOf('D'));
  });
});

describe('the library', () => {
  it('has the owner’s 690 contours, ids their values', () => {
    expect(CONTOUR_LIBRARY).toHaveLength(690);
    const byCount = (n: number) =>
      CONTOUR_LIBRARY.filter((c) => c.noteCount === n).length;
    expect([byCount(3), byCount(4), byCount(5)]).toEqual([164, 377, 149]);
    expect(new Set(CONTOUR_LIBRARY.map((c) => c.id)).size).toBe(690);
    for (const c of CONTOUR_LIBRARY) {
      expect(c.id).toBe(c.contour.join(','));
      expect(c.contour).toHaveLength(c.noteCount);
      expect([1, 2, 3, 4]).toContain(c.tier);
      expect(['common', 'uncommon', 'rare']).toContain(c.tag);
    }
  });

  it('names a contour’s motion', () => {
    expect(contourMotion([0, 1, 2])).toBe('rising');
    expect(contourMotion([2, 1, 0])).toBe('falling');
    expect(contourMotion([0, 2, 1, 0])).toBe('arch');
    expect(contourMotion([0, -1, 0])).toBe('valley');
    expect(contourMotion([0, 2, 1, 2])).toBe('wave');
    expect(contourMotion([0, 0, 1, 2])).toBe('repeated');
  });
});

describe('the starter set', () => {
  it('finds every curated id in the library', () => {
    const missing = CURATED_FILE.contours.filter(
      (entry) => !libraryContour(entry.id),
    );
    expect(missing).toEqual([]);
    expect(ECHO_CONTOURS).toHaveLength(CURATED_FILE.contours.length);
    expect(new Set(ECHO_CONTOURS.map((c) => c.id)).size).toBe(
      ECHO_CONTOURS.length,
    );
  });

  it('takes Level 1 from Tier 1 common, Level 2 Tier 2 common, Level 3 Tier 3', () => {
    for (const c of ECHO_CONTOURS) {
      expect(c.tier).toBe(c.level);
      if (c.level < 3) expect(c.tag).toBe('common');
      else expect(c.tag).not.toBe('rare');
    }
  });

  it('has about a dozen a level, of 3, 4 and 5 notes, every motion', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const set = contoursOfLevel(level);
      expect(set.length).toBeGreaterThanOrEqual(10);
      expect(set.length).toBeLessThanOrEqual(14);
      expect(new Set(set.map((c) => c.noteCount))).toEqual(new Set([3, 4, 5]));
      const motions = new Set(set.map((c) => c.motion));
      for (const motion of [
        'rising',
        'falling',
        'arch',
        'valley',
        'repeated',
      ] as const) {
        expect(motions, `Level ${level} ${motion}`).toContain(motion);
      }
    }
  });

  it('writes each motion as the contour moves', () => {
    for (const entry of CURATED_FILE.contours) {
      expect(entry.motion).toBe(
        contourMotion(libraryContour(entry.id)!.contour),
      );
    }
  });

  it('keeps every contour in the pad window at its level’s zero points', () => {
    for (const c of ECHO_CONTOURS) {
      for (const zp of ECHO_LEVELS[c.level].zeroPoints) {
        expect(fitsWindow(c.contour, zp), `${c.id} on ${zp}`).toBe(true);
      }
      expect(zeroPointsFor(c, c.level)).toEqual(
        ECHO_LEVELS[c.level].zeroPoints,
      );
    }
  });
});

describe('the pad window', () => {
  it('is ten positions at most: the 5 below the 1 up to the 7', () => {
    expect(PAD_WINDOW).toEqual({ low: -3, high: 6 });
    expect(PAD_WINDOW.high - PAD_WINDOW.low + 1).toBeLessThanOrEqual(10);
  });

  it('holds each level’s reach: an octave of pads at Level 1, ten after', () => {
    expect(levelSpan(1)).toEqual({ low: -3, high: 4 });
    expect(levelSpan(2)).toEqual({ low: -3, high: 6 });
    expect(levelSpan(3)).toEqual({ low: -3, high: 6 });
  });

  it('draws a level on its own and earlier contours, where they fit', () => {
    expect(levelContours(1).every((c) => c.level === 1)).toBe(true);
    expect(new Set(levelContours(2).map((c) => c.level))).toEqual(
      new Set([1, 2]),
    );
    expect(new Set(levelContours(3).map((c) => c.level))).toEqual(
      new Set([1, 2, 3]),
    );
    // Level 1's rising 5-note run fits on the 1 and the 3 at Level 2, not
    // the 5, which would take it past the 7.
    expect(zeroPointsFor(libraryContour('0,1,2,3,4')!, 2)).toEqual([1, 3]);
  });

  it('keeps every call inside it, at every level, in every key', () => {
    const rng = echoRandom('window');
    for (const level of ECHO_LEVEL_NUMBERS) {
      const span = levelSpan(level);
      for (let i = 0; i < 300; i++) {
        const mode = i % 2 ? 'major' : 'minor';
        const c = melodyCall(level, { tonic: 'Eb', mode }, rng, {
          boss: i % 3 === 0,
        });
        for (const note of c.notes) {
          expect(note.position).toBeGreaterThanOrEqual(span.low);
          expect(note.position).toBeLessThanOrEqual(span.high);
        }
        expect(ECHO_LEVELS[level].zeroPoints).toContain(c.zeroPoint);
      }
    }
  });
});
