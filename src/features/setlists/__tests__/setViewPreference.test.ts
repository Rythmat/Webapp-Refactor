import { describe, expect, it } from 'vitest';
import {
  gridBarsPerRow,
  resolveChartFormat,
  STAFF_MIN_HEIGHT,
  STAFF_MIN_WIDTH,
  TWO_BAR_MAX_WIDTH,
} from '../setViewPreference';

/**
 * What the stand shows on a given device, decided by the room it actually has
 * rather than the size of the window — the set rail and the Atlas sidebar take
 * their share first.
 */
describe('resolveChartFormat', () => {
  it('honours an explicit choice at any width', () => {
    expect(resolveChartFormat('staff', 320)).toBe('staff');
    expect(resolveChartFormat('chords', 1600)).toBe('chords');
  });

  it('gives a phone the chord grid and a tablet the staff', () => {
    // Measured on the real stand, rail drawered on the small ones.
    expect(resolveChartFormat('auto', 377, 715)).toBe('chords'); // iPhone upright
    expect(resolveChartFormat('auto', 732, 986)).toBe('staff'); // iPad upright
    expect(resolveChartFormat('auto', 772, 654)).toBe('staff'); // iPad sideways
    expect(resolveChartFormat('auto', 1032, 734)).toBe('staff'); // laptop
  });

  it('gives a sideways phone the grid, though it is wide enough for a staff', () => {
    // 764 passes the width test and fails on height: two systems and then a
    // page turn is not a chart you can play from.
    expect(resolveChartFormat('auto', 764, 199)).toBe('chords');
    expect(resolveChartFormat('auto', 764, STAFF_MIN_HEIGHT - 1)).toBe(
      'chords',
    );
    expect(resolveChartFormat('auto', 764, STAFF_MIN_HEIGHT)).toBe('staff');
  });

  it('ignores height when it has not been measured', () => {
    expect(resolveChartFormat('auto', 1032)).toBe('staff');
  });

  it('assumes the roomy case before the stand has been measured', () => {
    // Otherwise a desktop flashes the phone format on its first paint.
    expect(resolveChartFormat('auto', 0)).toBe('staff');
  });

  it('switches exactly at the threshold, not around it', () => {
    expect(resolveChartFormat('auto', STAFF_MIN_WIDTH - 1)).toBe('chords');
    expect(resolveChartFormat('auto', STAFF_MIN_WIDTH)).toBe('staff');
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
