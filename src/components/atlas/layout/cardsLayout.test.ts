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
  it('shows on a wide screen, events card open or not', () => {
    expect(at(1376, 422)).toBe('shown');
    expect(at(925, 422)).toBe('shown');
  });

  it('folds to a pill when the events card leaves too little room', () => {
    expect(at(860, 422)).toBe('collapsed');
    expect(at(860, 0)).toBe('shown');
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
