import { describe, expect, it } from 'vitest';
import { playheadSlotOffset } from '../LeadSheetStaff';

// ── The Lead Sheet's playhead across a multi-bar rest ──────────────────────
// A system draws one slot per bar, a rest one slot for its bars. The line
// used to take the bar number for the slot, so after a rest it ran ahead of
// the music (leadsheet-05).

describe('playheadSlotOffset', () => {
  const BAR = 1440;
  // Slots of a system: bar 4, a 3-bar rest at bars 5–7, bar 8.
  const slots = [
    { realIndex: 4, bars: 1 },
    { realIndex: 5, bars: 3 },
    { realIndex: 8, bars: 1 },
  ];

  it('moves through a bar at one slot per bar', () => {
    expect(playheadSlotOffset(4.5 * BAR, BAR, slots)).toBeCloseTo(0.5);
  });

  it('crosses a rest at the pace of its bars', () => {
    expect(playheadSlotOffset(5 * BAR, BAR, slots)).toBeCloseTo(1);
    expect(playheadSlotOffset(6.5 * BAR, BAR, slots)).toBeCloseTo(1.5);
  });

  it('is in the right slot after the rest', () => {
    expect(playheadSlotOffset(8.25 * BAR, BAR, slots)).toBeCloseTo(2.25);
  });
});
