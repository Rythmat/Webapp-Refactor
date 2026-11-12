/**
 * A band style's harmony (owner, 2026-11-10): how long its chords hold and
 * how early its changes are pushed, true of any progression it plays.
 */
import { describe, expect, it } from 'vitest';
import { holdsFor, layHarmony, pushed } from '../harmonicRhythm';

const BAR = 1920;
const at = (timed: ReturnType<typeof layHarmony>) =>
  timed.changes.map((c) => `${c.tick / BAR}:${c.symbol}`).join(' ');

describe('holdsFor', () => {
  it('holds a chord a bar by default, as long as the style says, or by its rhythm', () => {
    expect(holdsFor(4, undefined)).toEqual([4, 4, 4, 4]);
    expect(holdsFor(4, { barsPerChord: 2 })).toEqual([8, 8, 8, 8]);
    expect(holdsFor(2, { barsPerChord: 0.5 })).toEqual([2, 2]);
    expect(holdsFor(4, { rhythms: { '4': [8, 8, 4, 12] } })).toEqual([
      8, 8, 4, 12,
    ]);
    // A rhythm for another count, or a broken one, falls back.
    expect(holdsFor(3, { rhythms: { '4': [8, 8, 4, 12] } })).toEqual([4, 4, 4]);
    expect(holdsFor(2, { rhythms: { '2': [4, 0] } })).toEqual([4, 4]);
  });
});

describe('layHarmony', () => {
  const loop = ['Am', 'F', 'C', 'G'];

  it('lays a chord a bar, repeated to fill the bars', () => {
    const timed = layHarmony(loop, undefined, 8);
    expect(timed.length).toBe(8 * BAR);
    expect(at(timed)).toBe('0:Am 1:F 2:C 3:G 4:Am 5:F 6:C 7:G');
  });

  it('holds trap’s chords two bars each: the loop is the phrase', () => {
    const timed = layHarmony(loop, { barsPerChord: 2 }, 8);
    expect(at(timed)).toBe('0:Am 2:F 4:C 6:G');
    expect(timed.length).toBe(8 * BAR);
  });

  it('pushes every change, the downbeat’s into the bar before the loop comes round', () => {
    const timed = layHarmony(loop, { push: 240 }, 4);
    expect(timed.changes).toEqual([
      { tick: 0, symbol: 'Am' },
      { tick: BAR - 240, symbol: 'F' },
      { tick: 2 * BAR - 240, symbol: 'C' },
      { tick: 3 * BAR - 240, symbol: 'G' },
      { tick: 4 * BAR - 240, symbol: 'Am' },
    ]);
  });

  it('never pushes a change past the one before it', () => {
    const fast = pushed(
      {
        changes: [
          { tick: 0, symbol: 'C' },
          { tick: 100, symbol: 'F' },
          { tick: 200, symbol: 'G' },
        ],
        length: 960,
      },
      240,
    );
    const ticks = fast.changes.map((c) => c.tick);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
    expect(new Set(ticks).size).toBe(ticks.length);
  });
});
