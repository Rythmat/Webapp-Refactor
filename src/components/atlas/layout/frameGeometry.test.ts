import { describe, expect, it } from 'vitest';
import { BOTTOM_RAIL_PX, TOP_BAR_PX } from '@/daw/shell/layout/layoutModel';
import { FRAME_PX } from './frameGeometry';

describe('the Globe’s frame', () => {
  it('has the Studio’s rails', () => {
    expect(FRAME_PX.top).toBe(TOP_BAR_PX);
    expect(FRAME_PX.bottom).toBe(BOTTOM_RAIL_PX);
  });
});
