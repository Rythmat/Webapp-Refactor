import { describe, expect, it } from 'vitest';
import { createTapTempo } from '../tapTempo';

// Run: npx vitest run src/daw/shell/topbar/__tests__/tapTempo.test.ts

describe('tap tempo', () => {
  it('averages the last four gaps', () => {
    const tap = createTapTempo();
    expect(tap.tap(0)).toBeNull();
    expect(tap.tap(500)).toBe(120);
    tap.tap(1000);
    tap.tap(1500);
    // A slower fifth gap moves the average of the last four.
    expect(tap.tap(2100)).toBe(Math.round(60_000 / (2100 / 4)));
    // Six taps: only the last four gaps count.
    expect(tap.tap(2700)).toBe(Math.round(60_000 / ((2700 - 500) / 4)));
  });

  it('starts over after a two-second pause', () => {
    const tap = createTapTempo();
    tap.tap(0);
    tap.tap(1000);
    expect(tap.tap(4000)).toBeNull();
    expect(tap.tap(4600)).toBe(100);
  });
});
