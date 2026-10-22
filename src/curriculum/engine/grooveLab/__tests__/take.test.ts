import { describe, expect, it } from 'vitest';
import type { PlayedHit } from '../grade';
import { ALL_ARMED, cellsFromTake, emptyCells, withTake } from '../take';

const STEP = 0.15;
const START = 10;
const at = (
  step: number,
  lane: PlayedHit['lane'],
  nudge = 0,
  open = false,
) => ({
  t: START + step * STEP + nudge,
  lane,
  open,
});

describe('a take onto the grid', () => {
  it('puts each hit on the cell nearest where it was played', () => {
    const cells = cellsFromTake(
      [at(0, 'kick', -0.03), at(2, 'snare', 0.05), at(4, 'cymbal', -0.06)],
      START,
      STEP,
      8,
    );
    expect([...cells.kick]).toEqual([0]);
    expect([...cells.snare]).toEqual([2]);
    expect([...cells.cymbal]).toEqual([4]);
  });

  it('keeps an open hat open, and leaves out what falls outside the take', () => {
    const cells = cellsFromTake(
      [at(7, 'cymbal', 0, true), at(-2, 'kick'), at(8, 'kick')],
      START,
      STEP,
      8,
    );
    expect([...cells.open]).toEqual([7]);
    expect(cells.kick.size).toBe(0);
  });

  it('records only the armed tracks, and lays them over the rest', () => {
    const hits = [at(0, 'kick'), at(2, 'snare'), at(1, 'cymbal')];
    const kickOnly = { ...ALL_ARMED, snare: false, cymbal: false };
    const first = withTake(
      emptyCells(),
      cellsFromTake(hits, START, STEP, 8, kickOnly),
      kickOnly,
    );
    expect([...first.kick]).toEqual([0]);
    expect(first.snare.size + first.cymbal.size).toBe(0);
    // Then the hat, over the kick already down.
    const hatOnly = { kick: false, snare: false, cymbal: true };
    const second = withTake(
      first,
      cellsFromTake(
        [at(1, 'cymbal'), at(3, 'cymbal', 0, true)],
        START,
        STEP,
        8,
        hatOnly,
      ),
      hatOnly,
    );
    expect([...second.kick]).toEqual([0]);
    expect([...second.cymbal]).toEqual([1, 3]);
    expect([...second.open]).toEqual([3]);
  });

  it('replaces an armed track whole: a new take of it is a fresh start', () => {
    const was = withTake(
      emptyCells(),
      cellsFromTake([at(0, 'kick'), at(4, 'kick')], START, STEP, 8),
      ALL_ARMED,
    );
    const again = withTake(
      was,
      cellsFromTake([at(6, 'kick')], START, STEP, 8),
      ALL_ARMED,
    );
    expect([...again.kick]).toEqual([6]);
  });
});
