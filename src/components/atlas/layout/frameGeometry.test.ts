import { describe, expect, it } from 'vitest';
import {
  BOTTOM_RAIL_PX,
  SIDE_RAIL_PX,
  TOP_BAR_PX,
} from '@/daw/shell/layout/layoutModel';
import {
  FRAME_PX,
  INSPECTOR_PX,
  clampInspectorPx,
  inspectorMaxPx,
} from './frameGeometry';

describe('the Globe’s frame', () => {
  it('has the Studio’s rails', () => {
    expect(FRAME_PX.top).toBe(TOP_BAR_PX);
    expect(FRAME_PX.bottom).toBe(BOTTOM_RAIL_PX);
    expect(FRAME_PX.rail).toBe(SIDE_RAIL_PX);
  });

  it('keeps the Inspector between its limits and 70% of the map', () => {
    expect(clampInspectorPx(100, 1600)).toBe(INSPECTOR_PX.min);
    expect(clampInspectorPx(2000, 1600)).toBe(INSPECTOR_PX.max);
    expect(clampInspectorPx(500, 600)).toBe(420);
    // A map too narrow for 70% to reach the minimum still gets the minimum.
    expect(inspectorMaxPx(300)).toBe(INSPECTOR_PX.min);
  });
});
