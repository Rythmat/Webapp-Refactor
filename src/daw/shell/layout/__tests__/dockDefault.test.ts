/**
 * Every dock opens at the same height: just tall enough for an EQ in the
 * Effects dock to show its numbers (owner, 2026-10-22). A height the student
 * sets is every dock's, Master's too, and the dock's limits still hold.
 */
import { describe, expect, it } from 'vitest';
import { EQ_NUMBERS_MIN_H } from '@/daw/components/Effects/eqScale';
import { DOCK_SLOTS } from '../layoutModel';
import { DOCK_DEFAULT_PX, dockPxFor, dockSlotOf } from '../shellGeometry';

describe('the dock’s default height', () => {
  it('fits the EQ’s graph at the height where its numbers show', () => {
    // The dock's edge, the card row's padding and the card's header.
    expect(DOCK_DEFAULT_PX - EQ_NUMBERS_MIN_H).toBe(1 + 16 + 32);
    expect(dockPxFor('fx', {}, 700)).toBe(DOCK_DEFAULT_PX);
    expect(dockPxFor('fx', {}, 1100)).toBe(DOCK_DEFAULT_PX);
  });

  it('is the same for every dock, at any window height', () => {
    for (const body of [567, 611, 743, 1100]) {
      for (const slot of DOCK_SLOTS) {
        expect(dockPxFor(slot, {}, body)).toBe(DOCK_DEFAULT_PX);
      }
    }
  });

  it('keeps a height the student set, for that tab only', () => {
    const heights = { fx: 0.5 };
    expect(dockPxFor('fx', heights, 800)).toBe(400);
    expect(dockPxFor('piano-roll', heights, 800)).toBe(DOCK_DEFAULT_PX);
  });

  it('stays inside the dock’s limits in a short window', () => {
    expect(dockPxFor('fx', {}, 200)).toBeLessThanOrEqual(
      Math.max(184, Math.round(200 * 0.85)),
    );
  });

  it('keeps one height for every dock, Master’s too', () => {
    expect(dockSlotOf(null)).toBe('controls');
    expect(dockSlotOf('fx')).toBe('controls');
    expect(dockSlotOf('piano-roll')).toBe('controls');
    expect(dockSlotOf('fx', true)).toBe('controls');
    // A height left from when Master kept its own is never read.
    const heights = { controls: 0.4, master: 0.2 };
    expect(dockPxFor(dockSlotOf('fx', true), heights, 800)).toBe(320);
    expect(dockPxFor(dockSlotOf('controls'), heights, 800)).toBe(320);
  });
});
