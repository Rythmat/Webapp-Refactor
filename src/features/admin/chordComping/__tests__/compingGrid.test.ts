import { describe, expect, it } from 'vitest';
import { parseChart } from '@/curriculum/engine/bassLines/harmony';
import {
  chordTones,
  defaultDur,
  hitsPastEnd,
  movedHit,
  newHit,
  nextVelocity,
  previewHarmony,
  resizedDur,
  rollGeometry,
  rowOfTones,
  snapStep,
  timeOfStep,
  withIds,
  withoutIds,
} from '../compingGrid';

describe('rollGeometry', () => {
  it('4/4 in 8ths: quarter beats, 8 columns a bar', () => {
    const g = rollGeometry([4, 4], 2, 2);
    expect(g).toMatchObject({ stepQ: 0.5, beatQ: 1, barQ: 4, stepsPerBar: 8 });
    expect(g.totalSteps).toBe(16);
  });

  it('6/8 and 12/8 beat on the dotted quarter', () => {
    expect(rollGeometry([6, 8], 2, 1)).toMatchObject({
      beatQ: 1.5,
      barQ: 3,
      stepsPerBar: 6,
    });
    expect(rollGeometry([12, 8], 4, 1)).toMatchObject({
      beatQ: 1.5,
      stepsPerBar: 24,
    });
  });

  it('7/8 beats on each eighth; 3/4 triplets give 9 columns', () => {
    expect(rollGeometry([7, 8], 2, 1)).toMatchObject({
      beatQ: 0.5,
      stepsPerBar: 7,
    });
    expect(rollGeometry([3, 4], 3, 1).stepsPerBar).toBe(9);
  });
});

describe('hit placement', () => {
  const g = rollGeometry([4, 4], 2, 1);

  it('writes "bar:beat:sixteenth" times and snaps back to the same step', () => {
    expect(timeOfStep(3, 0.5, [4, 4])).toBe('0:1:2');
    expect(timeOfStep(9, 0.5, [4, 4])).toBe('1:0:2');
    const t3 = rollGeometry([4, 4], 3, 1);
    const time = timeOfStep(4, t3.stepQ, [4, 4]); // beat 2's second triplet
    expect(time).toBe('0:1:1.333333');
    expect(snapStep(4 * t3.stepQ - 1e-6, t3.stepQ, t3.totalSteps)).toBe(4);
  });

  it('a new hit is 0.9 of a step at velocity 0.75; full omits tones', () => {
    const full = newHit(2, 0, g, [4, 4]);
    expect(full).toMatchObject({ time: '0:1:0', dur: 0.45, velocity: 0.75 });
    expect(full.tones).toBeUndefined();
    expect(newHit(0, 2, g, [4, 4]).tones).toBe('top');
    expect(defaultDur(0.25)).toBe(0.225);
  });

  it('a hit at the end is clipped to the pattern', () => {
    expect(newHit(7, 0, g, [4, 4], 2).dur).toBe(0.5);
  });

  it('moves snapped, clamped, and across rows', () => {
    const h = { time: '0:1:0', dur: 0.45, velocity: 0.75 };
    expect(movedHit(h, 1, 0, 3, 1, g, [4, 4])).toMatchObject({
      time: '0:2:2',
      tones: 'upper',
    });
    expect(movedHit(h, 1, 0, -9, 0, g, [4, 4]).time).toBe('0:0:0');
    expect(movedHit(h, 1, 0, 20, 5, g, [4, 4])).toMatchObject({
      time: '0:3:2',
      tones: 'top',
    });
    expect(
      movedHit({ ...h, tones: 'top' as const }, 1, 2, 0, -2, g, [4, 4]).tones,
    ).toBeUndefined();
  });

  it('resizes to the end of a step, never past the pattern', () => {
    expect(resizedDur(0, 3, g)).toBe(1.95);
    expect(resizedDur(3.5, 20, g)).toBe(0.45);
    expect(resizedDur(1, 0, g)).toBe(0.45);
  });

  it('steps loudness 0.45 → 0.6 → 0.75 → 0.9 → 0.45', () => {
    expect(nextVelocity(0.45)).toBe(0.6);
    expect(nextVelocity(0.6)).toBe(0.75);
    expect(nextVelocity(0.75)).toBe(0.9);
    expect(nextVelocity(0.9)).toBe(0.45);
    expect(nextVelocity(0.66)).toBe(0.75);
  });

  it('round-trips ids and drops tones: full', () => {
    const hits = [
      { time: '0:0:0', dur: 1, velocity: 0.5, tones: 'full' as const },
      { time: '0:1:0', dur: 1, velocity: 0.5, tones: 'upper' as const },
    ];
    expect(withoutIds(withIds(hits))).toEqual([
      { time: '0:0:0', dur: 1, velocity: 0.5 },
      hits[1],
    ]);
    expect(rowOfTones(undefined)).toBe(0);
    expect(rowOfTones('top')).toBe(2);
  });

  it('counts hits past the last bar', () => {
    const hits = [
      { time: '0:3:2', dur: 0.4, velocity: 0.7 },
      { time: '1:0:0', dur: 0.4, velocity: 0.7 },
    ];
    expect(hitsPastEnd(hits, [4, 4], 4)).toBe(1);
  });
});

describe('preview harmony', () => {
  it('turns chart chords into realizer tones', () => {
    const [[g7, fm6]] = parseChart('| G7/B Fm6 |').bars;
    expect(chordTones(g7)).toEqual({
      rootPc: 7,
      bassPc: 11,
      intervals: [0, 4, 7, 10],
      third: 4,
      fifth: 7,
      seventh: 10,
    });
    const m6 = chordTones(fm6);
    expect(m6.intervals).toEqual([0, 3, 7, 9]);
    expect(m6.seventh).toBeUndefined();
  });

  it('loops the chart and covers a longer pattern', () => {
    const { bars } = parseChart('| C | F G |');
    const h = previewHarmony(bars, [4, 4], 4)!;
    expect(h).toMatchObject({ chartQ: 8, loopQ: 8, bars: 2 });
    expect(h.chordAt(0).rootPc).toBe(0);
    expect(h.chordAt(4 * 480).rootPc).toBe(5);
    expect(h.chordAt(6 * 480).rootPc).toBe(7);
    expect(h.chordAt(8 * 480).rootPc).toBe(0); // the chart repeats
    expect(previewHarmony(bars, [4, 4], 12)).toMatchObject({
      loopQ: 16,
      bars: 4,
    });
    expect(previewHarmony([], [4, 4], 4)).toBeNull();
  });
});
