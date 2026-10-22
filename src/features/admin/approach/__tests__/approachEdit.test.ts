import { describe, expect, it } from 'vitest';
import { withIds, type EditorNote } from '../../bassLines/BassRoll';
import {
  applyApproach as apply,
  approachLabel,
  type ApproachChoice,
} from '../approachEdit';

/** A bass line's approach notes: on the Approach row. */
const applyApproach = (
  notes: readonly EditorNote[],
  goalId: number,
  choice: ApproachChoice,
  stepQ: number,
  lineQ: number,
  ts: [number, number],
) =>
  apply(notes, goalId, choice, stepQ, lineQ, ts, (shared) => ({
    ...withIds([{ ...shared, degree: 'A' as const }])[0],
  }));

const ts: [number, number] = [4, 4];

describe('laying an approach before a goal', () => {
  // A root on 1 of each bar, a fifth on 3 of bar 1.
  const notes = withIds([
    { time: '0:0:0', degree: 'R', dur: 2, velocity: 0.9 },
    { time: '0:2:0', degree: '5', dur: 2, velocity: 0.8 },
    { time: '1:0:0', degree: 'R', dur: 4, velocity: 0.9 },
  ]);
  const goal = notes[2]._id;

  it('lays the pattern in grid steps ending on the goal, replacing what was there', () => {
    const out = applyApproach(
      notes,
      goal,
      { pattern: '2A1B', motion: 'chromatic', scale: 'key' },
      1,
      8,
      ts,
    );
    expect(out.map((n) => [n.time, n.degree, n.approach?.step])).toEqual([
      ['0:0:0', 'R', undefined],
      ['0:1:0', 'A', 2],
      ['0:2:0', 'A', 1],
      ['0:3:0', 'A', -1],
      ['1:0:0', 'R', undefined],
    ]);
    expect(out[1].dur).toBe(1);
    expect(out[1].velocity).toBe(0.9);
  });

  it('ends a note ringing into the approach where it starts', () => {
    const held = withIds([
      { time: '0:0:0', degree: 'R', dur: 3.8, velocity: 0.9 },
    ]);
    const out = applyApproach(
      held,
      held[0]._id,
      { pattern: '3B', motion: 'chromatic', scale: 'key' },
      1,
      4,
      ts,
    );
    expect(out.map((n) => [n.time, n.dur])).toEqual([
      ['0:0:0', 1],
      ['0:1:0', 1],
      ['0:2:0', 1],
      ['0:3:0', 1],
    ]);
  });

  it('wraps round the loop’s end for a goal near its start', () => {
    const out = applyApproach(
      notes,
      notes[0]._id,
      { pattern: '2B', motion: 'diatonic', scale: 'goal' },
      0.5,
      8,
      ts,
    );
    const laid = out.filter((n) => n.approach);
    expect(laid.map((n) => [n.time, n.approach])).toEqual([
      ['1:3:0', { step: -2, motion: 'diatonic', scale: 'goal' }],
      ['1:3:2', { step: -1, motion: 'diatonic', scale: 'goal' }],
    ]);
  });

  it('makes an approach it leads into a goal too: a chain', () => {
    const first = applyApproach(
      notes,
      goal,
      { pattern: '1B', motion: 'chromatic', scale: 'key' },
      1,
      8,
      ts,
    );
    const link = first.find((n) => n.approach)!;
    const chained = applyApproach(
      first,
      link._id,
      { pattern: '1A', motion: 'chromatic', scale: 'key' },
      1,
      8,
      ts,
    );
    expect(chained.find((n) => n._id === link._id)?.goal).toBe(true);
    expect(
      chained.filter((n) => n.approach).map((n) => n.approach!.step),
    ).toEqual([1, -1]);
  });
});

describe('an approach’s label', () => {
  it('says its steps, its motion and whether it is a goal', () => {
    expect(approachLabel({ approach: { step: 2, motion: 'chromatic' } })).toBe(
      '+2',
    );
    expect(
      approachLabel({ approach: { step: -1, motion: 'diatonic' }, goal: true }),
    ).toBe('−1d◎');
  });
});
