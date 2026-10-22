/**
 * The effect cards' sizing (FxCards' cardLayout): at any dock height from
 * its effects minimum up, a card's controls fit its body, so nothing spills
 * out; in one row a card keeps its main controls, and where it is tight or
 * the row is narrow the graph goes.
 *
 * Run: npx vitest run src/daw/components/Effects/__tests__/fxCardLayout.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  DOCK_FX_MIN_PX,
  DOCK_TAB_BAR_PX,
  dockMinPx,
  DOCK_MIN_PX,
} from '@/daw/shell/layout/layoutModel';
import {
  cardLayout,
  CARD_HEADER_PX,
  CARD_GAP_PX,
  KNOB_CELL_EXTRA_PX,
} from '../FxCards';

/** The EQ's band picker over its knobs. */
const EQ_BANDS_PX = 24;
/** Room for a sideways scrollbar under the row. */
const SCROLLBAR_PX = 12;

const controlsH = (rows: number, knob: number) =>
  rows * (knob + KNOB_CELL_EXTRA_PX) + (rows - 1) * 4;

describe('cardLayout', () => {
  it('shows every control in two rows at the floating frame’s height', () => {
    const l = cardLayout(224);
    expect(l.cardH).toBe(208);
    expect(l.rows).toBe(2);
    expect(l.keep).toBe(Infinity);
    expect(l.graph).toBe(true);
    expect(l.knob).toBeLessThanOrEqual(37);
  });

  it('keeps the main controls in one row, and fewer when tight', () => {
    const one = cardLayout(150);
    expect(one.rows).toBe(1);
    expect(one.keep).toBe(4);
    expect(one.graph).toBe(true);
    const tight = cardLayout(120);
    expect(tight.keep).toBe(3);
    expect(tight.graph).toBe(false);
  });

  it('drops the graph in a narrow row', () => {
    expect(cardLayout(224, 0, 500).graph).toBe(false);
    expect(cardLayout(224, 0, 1200).graph).toBe(true);
  });

  it('fits its controls in the body at every height from the dock’s minimum', () => {
    const from = DOCK_FX_MIN_PX - DOCK_TAB_BAR_PX - 1 - SCROLLBAR_PX;
    for (let rowH = from; rowH <= 800; rowH += 1) {
      for (const extra of [0, EQ_BANDS_PX]) {
        const l = cardLayout(rowH, extra);
        expect(l.bodyH).toBe(
          rowH - 2 * CARD_GAP_PX - CARD_HEADER_PX - CARD_GAP_PX,
        );
        expect(
          controlsH(l.rows, l.knob) + extra,
          `row ${rowH}, extra ${extra}`,
        ).toBeLessThanOrEqual(l.bodyH);
      }
    }
  });
});

describe('the dock’s minimum', () => {
  it('is taller for the device cards than for the editors', () => {
    for (const slot of ['controls', 'fx', 'master', 'rack'] as const) {
      expect(dockMinPx(slot)).toBe(DOCK_FX_MIN_PX);
    }
    for (const slot of ['piano-roll', 'prism', 'grooves'] as const) {
      expect(dockMinPx(slot)).toBe(DOCK_MIN_PX);
    }
  });
});
