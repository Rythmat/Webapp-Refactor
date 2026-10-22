// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  choicesStorageKey,
  emptyChoices,
  withMode,
  withProgression,
  withTonic,
  type SavedProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import {
  peekPracticeTrack,
  takePracticeTrack,
} from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { HearItWithYourBand } from '../HearItWithYourBand';
import { BAND_PICKS_KEY, PART_2_LESSON_ID } from '../bandProgressions';
import { readStopDone } from '../stopDone';

/**
 * Part 3's page: the student's progressions, the live bands, the band's
 * 4/4 styles at their tempos, and Hear It in the Studio.
 */

const PAGE = '/curriculum/music-literacy/hear-it-with-your-band';

const xxxx = ['X', 'X', 'X', 'X'] as SavedProgression['template'];
const dMinor = (harmony: SavedProgression['harmony']): SavedProgression => ({
  template: xxxx,
  chords: ['1', '4', '5', '6'],
  harmony,
  tonic: 'D',
  mode: 'minor',
});

function saveDMinor() {
  let choices = withMode(withTonic(emptyChoices(), 'D'), 'minor');
  choices = withProgression(choices, 'four-chords', dMinor('triads'));
  choices = withProgression(choices, 'four-chords-7ths', dMinor('sevenths'));
  choices = withProgression(choices, 'one-and-x', {
    ...dMinor('triads'),
    template: ['1', 'X'],
    chords: ['1', '4'],
  });
  localStorage.setItem(
    choicesStorageKey(PART_2_LESSON_ID),
    JSON.stringify(choices),
  );
}

/** Where the page navigated: the Studio's URL. */
function Studio() {
  const location = useLocation();
  return <p data-testid="studio">{location.pathname + location.search}</p>;
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={[PAGE]}>
      <Routes>
        <Route path={PAGE} element={<HearItWithYourBand />} />
        <Route path="/studio/editor" element={<Studio />} />
      </Routes>
    </MemoryRouter>,
  );
}

const choice = (key: string) =>
  document.querySelector<HTMLElement>(`[data-choice="${key}"]`);
const checked = (key: string) =>
  choice(key)?.querySelector('input')?.checked ?? false;
const bandsReady = () =>
  waitFor(() => expect(choice('band:latin-band-1')).not.toBeNull());

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  takePracticeTrack('', 0, 'A');
});

describe('Practice with a Band', () => {
  it('heads the page, with the way back to Start Here', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice with a Band' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Start Here' }).getAttribute('href'),
    ).toBe('/learn?tab=StartHere');
    for (const title of ['Your Progression', 'Choose a Band']) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
  });

  it('offers the student’s progressions, triads and 7ths, on four-chords', () => {
    saveDMinor();
    renderPage();
    const triads = within(screen.getByRole('radiogroup', { name: 'Triads' }));
    const sevenths = within(
      screen.getByRole('radiogroup', { name: 'With 7ths' }),
    );
    expect(triads.getAllByRole('radio')).toHaveLength(2);
    expect(sevenths.getAllByRole('radio')).toHaveLength(1);
    expect(checked('progression:four-chords')).toBe(true);
    const card = within(choice('progression:four-chords')!);
    expect(
      card.getAllByText(/^(1|4|5|♭6) (min|maj)$/).map((el) => el.textContent),
    ).toEqual(['1 min', '4 min', '5 min', '♭6 maj']);
    expect(card.getByText('Dm')).toBeTruthy();
    expect(card.getByText('B♭')).toBeTruthy();
    expect(card.getByText('D Minor')).toBeTruthy();
    // No starter while something is saved.
    expect(screen.queryByText(/starter/)).toBeNull();
  });

  it('plays a starter while nothing is saved, and says where to make one', () => {
    renderPage();
    expect(screen.getByText(/Nothing is saved yet/)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Melodies and Chords' })
        .getAttribute('href'),
    ).toBe('/curriculum/music-literacy/music-literacy-part-2');
    const card = within(choice('progression:starter')!);
    expect(card.getByText('C Major · Starter')).toBeTruthy();
    expect(card.getByText('6 min')).toBeTruthy();
  });

  it('lists the live bands, then the band’s 4/4 styles with their tempos', async () => {
    renderPage();
    await bandsReady();
    const bands = within(
      screen.getByRole('radiogroup', { name: 'Choose a Band' }),
    );
    expect(bands.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByText('Jazz Band 1')).toBeNull();
    expect(checked('band:latin-band-1')).toBe(true);
    const styles = within(
      screen.getByRole('radiogroup', { name: 'Choose a Style' }),
    );
    expect(styles.getByText('Reggaeton')).toBeTruthy();
    expect(styles.getByText('Cumbia')).toBeTruthy();
    expect(styles.queryByText('Mariachi')).toBeNull();
    expect(styles.getByText('96 BPM · 4/4')).toBeTruthy();

    fireEvent.click(choice('band:funk-band-1')!.querySelector('input')!);
    expect(checked('band:funk-band-1')).toBe(true);
    expect(checked('style:l1-pocket')).toBe(true);
    expect(screen.getByText('The Pocket')).toBeTruthy();
    expect(screen.getByText('Syncopation & Sauce')).toBeTruthy();
  });

  it('remembers the picks, and comes back to them', async () => {
    saveDMinor();
    renderPage();
    await bandsReady();
    fireEvent.click(
      choice('progression:four-chords-7ths')!.querySelector('input')!,
    );
    fireEvent.click(choice('band:hip-hop-band-1')!.querySelector('input')!);
    fireEvent.click(choice('style:l2-boom-bap')!.querySelector('input')!);
    expect(JSON.parse(localStorage.getItem(BAND_PICKS_KEY)!)).toEqual({
      progression: 'four-chords-7ths',
      band: 'hip-hop-band-1',
      variation: 'l2-boom-bap',
    });
    cleanup();
    renderPage();
    await bandsReady();
    expect(checked('progression:four-chords-7ths')).toBe(true);
    expect(checked('band:hip-hop-band-1')).toBe(true);
    expect(checked('style:l2-boom-bap')).toBe(true);
  });

  it('opens the Studio with the band playing the chart, and marks the stop done', async () => {
    saveDMinor();
    renderPage();
    await bandsReady();
    fireEvent.click(choice('style:l1-cumbia')!.querySelector('input')!);
    expect(document.querySelector('[data-band-summary]')?.textContent).toBe(
      'Latin Band 1 plays 1 min · 4 min · 5 min · ♭6 maj in D Minor, Cumbia style, at 96 BPM.',
    );
    expect(readStopDone('hear-it-with-your-band')).toBe(false);
    fireEvent.click(
      screen.getByRole('button', { name: 'Hear It in the Studio' }),
    );
    const studio = await screen.findByTestId('studio');
    expect(studio.textContent).toBe(
      '/studio/editor?practiceGenre=latin&practiceLevel=1&practiceSection=A&practiceBand=latin-band-1&practiceVariation=l1-cumbia&practiceKey=D&practiceKeyMode=minor&practiceHarmony=triads&practiceChords=1-4-5-6',
    );
    expect(readStopDone('hear-it-with-your-band')).toBe(true);
    const handed = peekPracticeTrack('latin', 1, 'A', {
      band: 'latin-band-1',
      variation: 'l1-cumbia',
      tonic: 'D',
      mode: 'minor',
      harmony: 'triads',
      chords: '1-4-5-6',
    });
    expect(handed?.track.chordCycle).toEqual(['Dm', 'Gm', 'Am', 'Bb']);
    // The switch offers every progression saved.
    expect(handed?.band?.literacy.charts.map((c) => c.id)).toEqual([
      'D.minor.triads.1-4',
      'D.minor.triads.1-4-5-6',
      'D.minor.sevenths.1-4-5-6',
    ]);
  });
});
