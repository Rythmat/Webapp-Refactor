/**
 * The dock's synth card sizing (OracleSynthCard's synthCardLayout): the
 * floating frame's 528 × 208 card at its height, then fewer controls as
 * the dock gets lower, and at every height from the dock's minimum up its
 * controls fit inside it.
 *
 * Run: npx vitest run src/daw/components/Controls/__tests__/synthCardLayout.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  DOCK_FX_MIN_PX,
  DOCK_TAB_BAR_PX,
} from '@/daw/shell/layout/layoutModel';
import { SYNTH_CARD_MAX_PX, synthCardLayout } from '../OracleSynthCard';

/** Room for a sideways scrollbar under the row. */
const SCROLLBAR_PX = 12;
/** A knob's name under it. */
const LABEL_PX = 20;

describe('synthCardLayout', () => {
  it('is the floating frame’s card at its height, every control showing', () => {
    const l = synthCardLayout(224);
    expect(l.mode).toBe('full');
    expect([l.cardW, l.cardH]).toEqual([528, SYNTH_CARD_MAX_PX]);
    expect(l.knob).toBe(37);
    expect(l.cutoff).toBe(50);
    expect(l.plotH).toBeGreaterThan(100);
  });

  it('never grows past 208 in a tall dock', () => {
    expect(synthCardLayout(600).cardH).toBe(SYNTH_CARD_MAX_PX);
  });

  it('drops controls as the dock gets lower', () => {
    expect(synthCardLayout(180).mode).toBe('compact');
    const tight = synthCardLayout(140);
    expect(tight.mode).toBe('tight');
    expect(tight.plotH).toBe(0);
  });

  it('fits at every height from the dock’s minimum', () => {
    const from = DOCK_FX_MIN_PX - DOCK_TAB_BAR_PX - 1 - SCROLLBAR_PX;
    for (let rowH = from; rowH <= 400; rowH++) {
      const l = synthCardLayout(rowH);
      const top = l.bodyH - 30 - 4;
      const at = `row ${rowH} (${l.mode})`;
      expect(l.cardH, at).toBeLessThanOrEqual(rowH - 16);
      expect(l.cutoff + LABEL_PX, at).toBeLessThanOrEqual(l.bodyH);
      if (l.mode === 'full') {
        expect(2 * (l.knob + LABEL_PX) + 8, at).toBeLessThanOrEqual(top);
        expect(l.cutoff + l.knob + 2 * LABEL_PX, at).toBeLessThanOrEqual(
          l.bodyH,
        );
      } else if (l.mode === 'compact') {
        expect(l.knob + LABEL_PX, at).toBeLessThanOrEqual(top);
        expect(l.plotH, at).toBeLessThanOrEqual(top);
      } else {
        expect(
          20 + 4 + Math.max(30, l.knob + LABEL_PX),
          at,
        ).toBeLessThanOrEqual(l.bodyH);
      }
    }
  });
});
