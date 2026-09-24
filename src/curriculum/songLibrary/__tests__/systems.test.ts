import { describe, expect, it } from 'vitest';
import { systemRowSizes } from '../systems';

describe('systemRowSizes', () => {
  it('breaks into systems of four', () => {
    expect(systemRowSizes(8)).toEqual([4, 4]);
    expect(systemRowSizes(4)).toEqual([4]);
  });
  it('folds a leftover one or two bars into the system before', () => {
    expect(systemRowSizes(9)).toEqual([4, 5]);
    expect(systemRowSizes(10)).toEqual([4, 6]);
    expect(systemRowSizes(5)).toEqual([5]);
  });
  it('leaves a leftover three, or a short section, as its own row', () => {
    expect(systemRowSizes(7)).toEqual([4, 3]);
    expect(systemRowSizes(2)).toEqual([2]);
  });
});
