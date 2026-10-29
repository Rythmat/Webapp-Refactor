// @vitest-environment jsdom
/**
 * The floating cards' choices last across visits in the viewer's browser,
 * and nothing stored wrongly can break the page.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { appReducer, initialAppState } from './appReducer';
import {
  CARDS_STORAGE_KEY,
  DEFAULT_CARD_PREFS,
  loadCardPrefs,
  saveCardPrefs,
} from './cardsStorage';

beforeEach(() => window.localStorage.clear());

describe('the cards’ choices', () => {
  it('start shown, with the Legend folded', () => {
    expect(loadCardPrefs()).toEqual(DEFAULT_CARD_PREFS);
    expect(initialAppState.cards).toEqual({ hidden: false, legendOpen: false });
  });

  it('come back as the viewer left them', () => {
    saveCardPrefs({ hidden: true, legendOpen: true });
    expect(loadCardPrefs()).toEqual({ hidden: true, legendOpen: true });
  });

  it('ignore what was stored wrongly', () => {
    window.localStorage.setItem(CARDS_STORAGE_KEY, '{"hidden":"yes"}');
    expect(loadCardPrefs()).toEqual(DEFAULT_CARD_PREFS);
    window.localStorage.setItem(CARDS_STORAGE_KEY, 'not json');
    expect(loadCardPrefs()).toEqual(DEFAULT_CARD_PREFS);
  });

  it('change one at a time, and only when they do', () => {
    const hidden = appReducer(initialAppState, {
      type: 'SET_CARD_PREFS',
      payload: { hidden: true },
    });
    expect(hidden.cards).toEqual({ hidden: true, legendOpen: false });
    expect(
      appReducer(hidden, { type: 'SET_CARD_PREFS', payload: { hidden: true } }),
    ).toBe(hidden);
  });
});
