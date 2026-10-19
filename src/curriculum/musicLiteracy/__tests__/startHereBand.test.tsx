// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StartHere } from '@/components/learn/StartHere';
import {
  choicesStorageKey,
  emptyChoices,
  withProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import { BAND_PICKS_KEY, PART_2_LESSON_ID } from '../bandProgressions';
import { stopDoneKey } from '../stopDone';

/**
 * Learn → Start Here's third stop, Hear It with Your Band: open, with its
 * page as the way in; in the key of the progression the page opens on;
 * done once the Studio has opened from it.
 */

const stop = () =>
  document.querySelector<HTMLElement>(
    '[data-path-stop="hear-it-with-your-band"]',
  )!;

function renderPath() {
  render(
    <MemoryRouter>
      <StartHere />
    </MemoryRouter>,
  );
  return within(stop());
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('Start Here’s band stop', () => {
  it('is open, its page the way in, in the starter’s C major', () => {
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('new');
    expect(card.getByText('Hear It with Your Band')).toBeTruthy();
    expect(card.getByText(/Studio · Practice/)).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Start Hear It with Your Band' })
        .getAttribute('href'),
    ).toBe('/curriculum/music-literacy/hear-it-with-your-band');
    expect(card.getByRole('img', { name: 'C Major' })).toBeTruthy();
    // No steps to count, so no pips.
    expect(card.queryByRole('img', { name: /steps passed/ })).toBeNull();
  });

  it('wears the key of the progression its page opens on', () => {
    const choices = withProgression(emptyChoices(), 'four-chords', {
      template: ['X', 'X', 'X', 'X'],
      chords: ['1', '4', '5', '6'],
      harmony: 'triads',
      tonic: 'Bb',
      mode: 'minor',
    });
    localStorage.setItem(
      choicesStorageKey(PART_2_LESSON_ID),
      JSON.stringify(choices),
    );
    localStorage.setItem(
      BAND_PICKS_KEY,
      JSON.stringify({ progression: 'four-chords' }),
    );
    const card = renderPath();
    expect(card.getByRole('img', { name: 'B♭ Minor' })).toBeTruthy();
  });

  it('is done once the Studio has opened from it, to play again', () => {
    localStorage.setItem(stopDoneKey('hear-it-with-your-band'), '1');
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('done');
    expect(
      card
        .getByRole('link', { name: 'Play again Hear It with Your Band' })
        .getAttribute('href'),
    ).toBe('/curriculum/music-literacy/hear-it-with-your-band');
  });
});
