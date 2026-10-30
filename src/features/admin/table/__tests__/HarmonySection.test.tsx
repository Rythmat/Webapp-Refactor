// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHarmonyIndex } from '@/content/harmony';
import type { Song } from '@/curriculum/types/songLibrary';
import { ProgressionHeardIn, SongProgressions } from '../panel/HarmonySection';

/**
 * The row panel's crosscheck: what the chords say beside what a person
 * linked, strongest first, the passing ones a click away.
 */

const song = (id: string, title: string, bars: string[]): Song =>
  ({
    id,
    title,
    artist: 'Artist',
    key: 'C major',
    keyRoot: 60,
    mode: 'major',
    tempo: 100,
    sections: [
      {
        id: 'chorus',
        label: 'Chorus',
        bars: bars.map((degree) => ({
          chords: [{ degree, chordName: '', beat: 1, duration: 4 }],
        })),
      },
    ],
  }) as unknown as Song;

const LOOP = ['1 maj', '5 maj', '6 min', '4 maj'];
const index = buildHarmonyIndex({
  progressions: [
    { id: 662, chords: ['1 major', '5 major', '6 minor', '4 major'] },
  ],
  songs: [
    song('looped', 'Looped Song', [...LOOP, ...LOOP]),
    song('linked', 'Linked Song', LOOP),
    // 6-4-1-5: holds 1-5-6-4 only across its seam.
    song('passing', 'Passing Song', [
      '6 min',
      '4 maj',
      '1 maj',
      '5 maj',
      '6 min',
      '4 maj',
      '1 maj',
      '5 maj',
    ]),
  ],
  flows: [
    {
      genre: 'pop',
      level: 1,
      params: { defaultKey: 'C major' },
      sections: [
        {
          id: 'C',
          steps: [
            {
              stepNumber: 4,
              activity: 'C1.4: Four chords',
              chordSymbols: ['C', 'G', 'Am', 'F'],
            },
          ],
        },
      ],
    },
  ],
});

vi.mock('../../content/chords/useHarmonyIndex', () => ({
  useHarmonyIndex: () => index,
}));

afterEach(cleanup);

const renderIn = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('a progression’s Heard in', () => {
  it('lists the songs that play it squarely, the linked ones marked', () => {
    renderIn(<ProgressionHeardIn progressionId={662} linked={['linked']} />);
    const section = screen.getByRole('region', { name: /Heard in/ });
    expect(within(section).getByRole('heading')).toHaveTextContent(
      'Heard in · 2',
    );
    const songs = within(section)
      .getAllByRole('link', { name: /Song$/ })
      .map((a) => [a.textContent, a.getAttribute('href')]);
    expect(songs).toEqual([
      ['Looped Song', '/console/table/songs/looped'],
      ['Linked Song', '/console/table/songs/linked'],
    ]);
    expect(within(section).getByText('linked')).toBeInTheDocument();
    expect(
      within(section).getByText(/looped ×2, same chords/),
    ).toBeInTheDocument();
  });

  it('shows the passing ones on asking', () => {
    renderIn(<ProgressionHeardIn progressionId={662} linked={[]} />);
    expect(screen.queryByText('Passing Song')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: /Also passing and loose · 1/ }),
    );
    expect(screen.getByText('Passing Song')).toBeInTheDocument();
    expect(screen.getByText(/passing through/)).toBeInTheDocument();
  });

  it('links the genre lesson that plays it, at its section', () => {
    renderIn(<ProgressionHeardIn progressionId={662} linked={[]} />);
    expect(
      screen.getByRole('link', { name: /pop L1 · C · C1.4: Four chords/ }),
    ).toHaveAttribute('href', '/learn/keyboard/genre/pop/1?section=C');
  });
});

describe('a song’s Progressions heard', () => {
  it('names each progression its chart plays, linking its row', () => {
    renderIn(
      <SongProgressions
        songId="looped"
        labelOf={() => '1 major - 5 major - 6 minor - 4 major'}
      />,
    );
    expect(
      screen.getByRole('link', {
        name: '1 major - 5 major - 6 minor - 4 major',
      }),
    ).toHaveAttribute('href', '/console/table/progressions/662');
  });
});
