/**
 * The dock's synth card sizing (OracleSynthCard's synthCardLayout): the
 * floating frame's card to the pixel at its height (528 × 208: a 160 px
 * body, 154 × 122 plots, 64 px knob tiles, a 50 px Cutoff), then fewer
 * controls as the dock gets lower, and at every height from the dock's
 * minimum up its controls fit inside it.
 *
 * Run: npx vitest run src/daw/components/Controls/__tests__/synthCardLayout.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  DOCK_FX_MIN_PX,
  DOCK_TAB_BAR_PX,
} from '@/daw/shell/layout/layoutModel';
import {
  SYNTH_CARD_MAX_PX,
  SYNTH_CARD_W,
  synthCardLayout,
} from '../OracleSynthCard';

/** Room for a sideways scrollbar under the row. */
const SCROLLBAR_PX = 12;
/** A device knob's height with its name: the name rides 6/37 up into it. */
const knobH = (size: number) => size - Math.round((6 * size) / 37) + 15;

describe('synthCardLayout', () => {
  it('is the floating frame’s card at its height', () => {
    const l = synthCardLayout(224);
    expect(SYNTH_CARD_W).toBe(528);
    expect(l).toMatchObject({
      mode: 'full',
      cardH: SYNTH_CARD_MAX_PX,
      bodyH: 160,
      plotH: 122,
      knob: 37,
      cutoff: 50,
      tileH: 64,
    });
  });

  it('never grows past 208 in a tall dock', () => {
    expect(synthCardLayout(600).cardH).toBe(SYNTH_CARD_MAX_PX);
  });

  it('keeps every control a little under the frame’s height, then drops some', () => {
    expect(synthCardLayout(222).mode).toBe('full');
    expect(synthCardLayout(200).mode).toBe('compact');
    const tight = synthCardLayout(160);
    expect(tight.mode).toBe('tight');
    expect(tight.plotH).toBe(0);
  });

  it('fits at every height from the dock’s minimum', () => {
    const from = DOCK_FX_MIN_PX - DOCK_TAB_BAR_PX - 1 - SCROLLBAR_PX;
    for (let rowH = from; rowH <= 400; rowH++) {
      const l = synthCardLayout(rowH);
      const at = `row ${rowH} (${l.mode})`;
      expect(l.cardH, at).toBeLessThanOrEqual(rowH - 16);
      if (l.mode === 'full') {
        // Two tiles over the selects; a knob and its name in each tile.
        expect(2 * l.tileH + 30 + 2, at).toBeLessThanOrEqual(l.bodyH);
        expect(10 + knobH(l.knob), at).toBeLessThanOrEqual(l.tileH);
        expect(20 + knobH(l.cutoff), at).toBeLessThanOrEqual(l.bodyH - l.tileH);
        expect(l.plotH + 3, at).toBeLessThanOrEqual(l.bodyH - 30 - 1);
      } else if (l.mode === 'compact') {
        expect(l.plotH + 3, at).toBeLessThanOrEqual(l.bodyH - 30 - 1);
        expect(10 + knobH(l.knob), at).toBeLessThanOrEqual(l.tileH);
        expect(knobH(l.cutoff), at).toBeLessThanOrEqual(l.bodyH);
      } else {
        expect(32 + Math.max(30, knobH(l.knob)), at).toBeLessThanOrEqual(
          l.bodyH,
        );
        expect(knobH(l.cutoff), at).toBeLessThanOrEqual(l.bodyH);
      }
    }
  });
});
