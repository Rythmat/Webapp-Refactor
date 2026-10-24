// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseChordNotation,
  getChordNotation,
  getChordNotationSwitcherEnabled,
  getSelectedChordNotation,
  setChordNotation,
  setChordNotationSwitcherEnabled,
  subscribeChordNotation,
} from '..';

describe('chord notation preference', () => {
  beforeEach(() => localStorage.clear());

  it('is off and hybrid by default', () => {
    expect(getChordNotationSwitcherEnabled()).toBe(false);
    expect(getSelectedChordNotation()).toBe('hybrid');
    expect(getChordNotation()).toBe('hybrid');
  });

  it('writes hybrid while the switcher is off, keeping the pick for later', () => {
    setChordNotation('jazz');
    expect(getSelectedChordNotation()).toBe('jazz');
    expect(getChordNotation()).toBe('hybrid');

    setChordNotationSwitcherEnabled(true);
    expect(getChordNotation()).toBe('jazz');

    setChordNotationSwitcherEnabled(false);
    expect(getChordNotation()).toBe('hybrid');
  });

  it('applies a lesson’s choice everywhere without showing the switcher', () => {
    chooseChordNotation('jazz');
    expect(getChordNotation()).toBe('jazz');
    // The top rail stays as it was: only Settings shows the switcher.
    expect(getChordNotationSwitcherEnabled()).toBe(false);

    // Settings off goes back to hybrid, the lesson's choice included.
    setChordNotationSwitcherEnabled(false);
    expect(getChordNotation()).toBe('hybrid');
  });

  it('keeps a choice made before the switcher had its own key, hidden', () => {
    // A lesson used to turn the switcher on in this key.
    localStorage.setItem('musicAtlas:chordNotationSwitcher', '1');
    localStorage.setItem('musicAtlas:chordNotation', 'jazz');
    expect(getChordNotation()).toBe('jazz');
    expect(getChordNotationSwitcherEnabled()).toBe(false);
  });

  it('ignores an unknown stored notation', () => {
    localStorage.setItem('musicAtlas:chordNotation', 'klingon');
    expect(getSelectedChordNotation()).toBe('hybrid');
  });

  it('notifies subscribers in this tab and from other tabs', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeChordNotation(listener);

    setChordNotation('roman');
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'musicAtlas:chordNotationSwitcher' }),
    );
    expect(listener).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setChordNotation('jazz');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
