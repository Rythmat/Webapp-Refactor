import { describe, expect, it } from 'vitest';
import { SCREEN_SIZES } from '@/constants/theme';
import {
  gridBarsPerRow,
  isPhoneViewport,
  PHONE_MEDIA_QUERY,
  resolveChartFormat,
  TWO_BAR_MAX_WIDTH,
} from '../setViewPreference';

/**
 * The staff chart is the chart. Only a phone is given the chord grid instead,
 * and nothing about how the stand is divided up changes that — a cramped
 * stand on a laptop is a window to widen or a choice to make in the menu.
 */
describe('resolveChartFormat', () => {
  it('honours an explicit choice on any device', () => {
    expect(resolveChartFormat('staff', true)).toBe('staff');
    expect(resolveChartFormat('chords', false)).toBe('chords');
  });

  it('gives a phone the chord grid and everything else the staff', () => {
    expect(resolveChartFormat('auto', true)).toBe('chords');
    expect(resolveChartFormat('auto', false)).toBe('staff');
  });
});

describe('isPhoneViewport', () => {
  it('knows a phone from a tablet, whichever way round it is held', () => {
    expect(isPhoneViewport(393, 852)).toBe(true); // iPhone upright
    expect(isPhoneViewport(852, 393)).toBe(true); // iPhone sideways
    expect(isPhoneViewport(956, 440)).toBe(true); // the largest iPhone, sideways
    expect(isPhoneViewport(768, 1024)).toBe(false); // iPad upright
    expect(isPhoneViewport(1024, 768)).toBe(false); // iPad sideways
    expect(isPhoneViewport(744, 1133)).toBe(false); // iPad mini upright
    expect(isPhoneViewport(1512, 858)).toBe(false); // laptop
  });

  it('turns over exactly at the sm breakpoint', () => {
    expect(isPhoneViewport(SCREEN_SIZES.sm - 1, 900)).toBe(true);
    expect(isPhoneViewport(SCREEN_SIZES.sm, 900)).toBe(false);
  });

  it('is the same rule the media query asks', () => {
    // Both sides of the comma, so it matches when either side is short.
    expect(PHONE_MEDIA_QUERY).toBe(
      `(max-width: ${SCREEN_SIZES.sm - 0.02}px), (max-height: ${SCREEN_SIZES.sm - 0.02}px)`,
    );
  });
});

describe('gridBarsPerRow', () => {
  it('keeps four bars across a phone, as iRealPro does', () => {
    // The compact symbol is what makes them fit, not a narrower row.
    expect(gridBarsPerRow(393)).toBe(4); // iPhone portrait
    expect(gridBarsPerRow(380)).toBe(4);
    expect(gridBarsPerRow(772)).toBe(4);
  });

  it('drops to two only when a quarter of the row is hopeless', () => {
    expect(gridBarsPerRow(TWO_BAR_MAX_WIDTH - 1)).toBe(2);
    expect(gridBarsPerRow(TWO_BAR_MAX_WIDTH)).toBe(4);
  });

  it('keeps the chart own shape before it has been measured', () => {
    expect(gridBarsPerRow(0)).toBe(4);
  });
});
