import { describe, expect, it } from 'vitest';
import type { ApproachStep } from '../../approach/approach';
import { realizeLine, type BassLine, type BassLineNote } from '../bassLine';
import { parseChart } from '../harmony';

const NAMES = 'C C# D Eb E F F# G Ab A Bb B'.split(' ');
const name = (m: number) => NAMES[((m % 12) + 12) % 12];

const line = (
  notes: BassLineNote[],
  length = '1m',
  grid: BassLine['gridResolution'] = '8n',
): BassLine => ({
  id: 'test',
  name: 'Test',
  status: 'draft',
  timeSignature: [4, 4],
  length,
  gridResolution: grid,
  instrument: 'electric',
  grooves: [],
  anchorOnChange: true,
  notes,
});

const note = (
  time: string,
  degree: BassLineNote['degree'],
  dur: number,
  approach?: ApproachStep,
  goal?: boolean,
): BassLineNote => ({
  time,
  degree,
  dur,
  velocity: 0.8,
  ...(approach ? { approach } : {}),
  ...(goal ? { goal } : {}),
});

const played = (l: BassLine, chart: string, key?: number[]) =>
  realizeLine(l, parseChart(chart).bars, {
    timeSignature: [4, 4],
    ...(key ? { approachKey: key } : {}),
  }).notes.map((n) => name(n.midi));

const chromatic = (step: number): ApproachStep => ({
  step,
  motion: 'chromatic',
});

// The root on beat 1, three quarters into the next bar's root.
const intoNextRoot = (approach: (step: number) => ApproachStep) =>
  line([
    note('0:0:0', 'R', 1),
    note('0:1:0', 'A', 1, approach(-3)),
    note('0:2:0', 'A', 1, approach(-2)),
    note('0:3:0', 'A', 1, approach(-1)),
  ]);

describe('a bass line’s approaches, set by hand', () => {
  it('three chromatic from below lead into the next root, whatever it is', () => {
    const l = intoNextRoot(chromatic);
    expect(played(l, '| C7 | F7 |')).toEqual([
      'C',
      'D',
      'Eb',
      'E',
      'F',
      'A',
      'Bb',
      'B',
    ]);
    // Over another chart, the same relationship: into A♭, then C.
    expect(played(l, '| C7 | Ab7 |')).toEqual([
      'C',
      'F',
      'F#',
      'G',
      'Ab',
      'A',
      'Bb',
      'B',
    ]);
  });

  it('diatonic to the key steps through the key: C D E into F, in C', () => {
    const l = intoNextRoot((step) => ({ step, motion: 'diatonic' }));
    expect(played(l, '| C | F |', [0, 2, 4, 5, 7, 9, 11]).slice(0, 5)).toEqual([
      'C',
      'C',
      'D',
      'E',
      'F',
    ]);
  });

  it('diatonic to the key or to the goal: F or F♯ above E7, in A minor', () => {
    const into = (scale: ApproachStep['scale']) =>
      line([
        note('0:0:0', 'R', 3),
        note('0:3:0', 'A', 1, { step: 1, motion: 'diatonic', scale }),
      ]);
    const aMinor = [9, 11, 0, 2, 4, 5, 7];
    expect(played(into('key'), '| Am | E7 |', aMinor)[1]).toBe('F');
    expect(played(into('goal'), '| Am | E7 |', aMinor)[1]).toBe('F#');
  });

  it('chains: C♯ E E♭ C♯ D F E D into E♭', () => {
    const steps = [-1, 2, 1, -1, -1, 2, 1, -1];
    const l = line(
      [
        ...steps.map((step, i) =>
          note(
            `0:${Math.floor(i / 2)}:${(i % 2) * 2}`,
            'A',
            0.5,
            chromatic(step),
            i === 4,
          ),
        ),
        note('1:0:0', 'R', 4),
      ],
      '2m',
    );
    expect(played(l, '| Bb7 | Eb |')).toEqual([
      'C#',
      'E',
      'Eb',
      'C#',
      'D',
      'F',
      'E',
      'D',
      'Eb',
    ]);
  });

  it('keeps an approach that lands on a change an approach', () => {
    // On beat 1 of bar 2 the chart changes; the approach is still +1 from
    // the goal on beat 2, not the new chord's root.
    const l = line(
      [
        note('0:0:0', 'R', 4),
        note('1:0:0', 'A', 1, chromatic(1)),
        note('1:1:0', '3', 3),
      ],
      '2m',
    );
    expect(played(l, '| C | G |')).toEqual(['C', 'C', 'B']);
  });
});
