import { describe, expect, it } from 'vitest';
import { combineInsets, insetsFrom, NO_MAP_INSETS } from './mapInsets';

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('what the overlays cover of the map', () => {
  const container = box(72, 116, 1368, 784);

  it('measures each zone from the edge it stands on', () => {
    expect(
      insetsFrom(container, {
        left: box(88, 132, 480, 600),
        top: box(1100, 132, 324, 40),
        bottom: [box(88, 760, 1336, 124)],
        right: [box(1120, 200, 304, 500)],
      }),
    ).toEqual({ top: 56, left: 496, bottom: 140, right: 320 });
  });

  it('counts nothing for a zone that is absent or hidden', () => {
    expect(
      insetsFrom(container, {
        left: box(0, 0, 0, 0),
        top: null,
        bottom: [undefined, null],
        right: [],
      }),
    ).toEqual({ top: 0, left: 0, bottom: 0, right: 0 });
  });

  it('takes the deepest of several along one edge (a sheet and a bar)', () => {
    expect(
      insetsFrom(container, {
        bottom: [box(80, 700, 360, 100), box(72, 500, 375, 400)],
      }).bottom,
    ).toBe(400);
  });
});

describe('combining the zones', () => {
  it('keeps the deepest inset on each edge', () => {
    const cards = { top: 0, right: 0, bottom: 40, left: 307 };
    const inspector = { top: 0, right: 408, bottom: 40, left: 0 };
    const phone = { top: 0, right: 0, bottom: 350, left: 0 };
    expect(combineInsets([cards, inspector])).toEqual({
      top: 0,
      right: 408,
      bottom: 40,
      left: 307,
    });
    expect(combineInsets([cards, inspector, phone]).bottom).toBe(350);
    expect(combineInsets([])).toEqual(NO_MAP_INSETS);
  });
});
