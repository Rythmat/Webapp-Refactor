/**
 * A key as the harmony code reads it: the tonic the lane counts degrees
 * from, and the parent major key Prism's graph is written in.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/keyFrame.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  degreeToPc,
  fromGraph,
  keyFrame,
  keyFrameOf,
  pcToDegree,
  toGraph,
  tonicDegreeOf,
} from '../keyFrame';

describe('keyFrame', () => {
  it('finds the parent major key of a diatonic mode', () => {
    expect(keyFrame(9, 'aeolian')).toEqual({
      tonicPc: 9,
      mode: 'aeolian',
      parentPc: 0,
      diatonic: true,
    });
    expect(keyFrame(2, 'dorian').parentPc).toBe(0);
    expect(keyFrame(7, 'mixolydian').parentPc).toBe(0);
  });

  it('is its own parent outside the seven diatonic modes', () => {
    expect(keyFrame(9, 'harmonicMinor')).toMatchObject({
      parentPc: 9,
      diatonic: false,
    });
  });

  it('is null for a project with no key', () => {
    expect(keyFrameOf(null, 'ionian')).toBeNull();
    expect(keyFrameOf(undefined, 'dorian')).toBeNull();
    expect(keyFrameOf(4, '')).toMatchObject({ tonicPc: 4, mode: 'ionian' });
  });
});

describe('crossing between the lane and the graph', () => {
  const aMinor = keyFrame(9, 'aeolian');

  it("reads A minor's Am as the graph's vi, and back", () => {
    expect(toGraph(aMinor, '1 minor')).toBe('6 minor');
    expect(fromGraph(aMinor, '6 minor')).toBe('1 minor');
    expect(fromGraph(aMinor, '4 major')).toBe('b6 major');
  });

  it("keeps a slash chord's engine quality, which places its own bass", () => {
    // E/G♯ (V of vi): the '/3' is E's third, wherever E sits in the key.
    expect(fromGraph(aMinor, '3 major/3')).toBe('5 major/3');
    expect(toGraph(aMinor, '5 major/3')).toBe('3 major/3');
    expect(fromGraph(aMinor, '4 major/1')).toBe('b6 major/1');
  });
});

describe('degrees and pitch classes', () => {
  it('reads a degree on the major scale from a root', () => {
    expect(degreeToPc('1', 9)).toBe(9);
    expect(degreeToPc('b3', 9)).toBe(0);
    expect(degreeToPc('♭7', 0)).toBe(10);
    expect(degreeToPc('#4', 0)).toBe(6);
    expect(degreeToPc('8', 0)).toBeNull();
  });

  it('writes a pitch class as the lane writes degrees', () => {
    expect([0, 1, 3, 6, 8, 10, 11].map((pc) => pcToDegree(pc, 0))).toEqual([
      '1',
      'b2',
      'b3',
      '#4',
      'b6',
      'b7',
      '7',
    ]);
    expect(tonicDegreeOf(keyFrame(9, 'aeolian'), 0)).toBe('b3');
  });
});
