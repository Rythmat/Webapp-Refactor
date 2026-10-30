import { describe, expect, it } from 'vitest';
import { cardsMode } from './cardsLayout';

const at = (stageWidth: number, inspectorPx: number) =>
  cardsMode({
    hidden: false,
    river: false,
    phone: false,
    stageWidth,
    inspectorPx,
    remPx: 17.6,
  });

describe('where the cards sit', () => {
  it('stays full on a wide screen, Inspector open or not', () => {
    expect(at(1376, 408)).toBe('full');
    expect(at(1216, 408)).toBe('full');
  });

  it('narrows, then folds to a pill, as the Inspector takes the room', () => {
    expect(at(1088, 408)).toBe('compact');
    expect(at(960, 408)).toBe('collapsed');
    expect(at(960, 0)).toBe('full');
  });

  it('steps aside on the river, on a phone, or when hidden', () => {
    expect(
      cardsMode({
        hidden: true,
        river: false,
        phone: false,
        stageWidth: 2000,
        inspectorPx: 0,
        remPx: 16,
      }),
    ).toBe('hidden');
    expect(
      cardsMode({
        hidden: false,
        river: true,
        phone: false,
        stageWidth: 2000,
        inspectorPx: 0,
        remPx: 16,
      }),
    ).toBe('hidden');
    expect(
      cardsMode({
        hidden: false,
        river: false,
        phone: true,
        stageWidth: 2000,
        inspectorPx: 0,
        remPx: 16,
      }),
    ).toBe('hidden');
  });
});
