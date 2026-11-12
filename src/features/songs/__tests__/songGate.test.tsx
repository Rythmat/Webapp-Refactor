// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SongDetailPage } from '@/components/songLibrary/SongDetailPage';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  isSongOpen,
  lightFilterOf,
  matchesLight,
  openFirst,
  songLight,
  SongLightsContext,
} from '../songGate';

/**
 * A chart's light (owner, 2026-11-12): green opens, red is Coming soon to
 * students, wherever the link came from; the console opens it.
 */

const SONGS: Record<string, Partial<Song>> = {
  ready: { id: 'ready', title: 'Ready Song', artist: 'Someone' },
  red: { id: 'red', title: 'Red Song', artist: 'Someone', comingSoon: true },
};

vi.mock('@/curriculum/data/songs', () => ({
  getSong: (id: string) => SONGS[id] ?? null,
}));
vi.mock('@/components/songLibrary/SongDetailView', () => ({
  SongDetailView: ({ song }: { song: Song }) => (
    <p data-testid="song-page">{song.title}</p>
  ),
}));
vi.mock('@/components/explore/songArt', () => ({
  SongThumb: () => <span data-testid="art" />,
}));
const recordView = vi.hoisted(() => vi.fn());
vi.mock('@/features/songs/useViewedSongsStore', () => ({
  useViewedSongsStore: (pick: (s: { recordView: unknown }) => unknown) =>
    pick({ recordView }),
}));

afterEach(() => {
  cleanup();
  recordView.mockClear();
});

const openPage = (id: string, lights = false) =>
  render(
    <SongLightsContext.Provider value={lights}>
      <MemoryRouter initialEntries={[`/songs/${id}`]}>
        <Routes>
          <Route path="/songs/:songId" element={<SongDetailPage />} />
        </Routes>
      </MemoryRouter>
    </SongLightsContext.Provider>,
  );

describe('the light', () => {
  it('is green unless the song says it is coming soon', () => {
    expect(songLight({})).toBe('green');
    expect(songLight({ comingSoon: false })).toBe('green');
    expect(songLight({ comingSoon: true })).toBe('red');
    expect(isSongOpen({})).toBe(true);
    expect(isSongOpen({ comingSoon: true })).toBe(false);
  });

  it('puts the open songs first, each group in its order', () => {
    const a = { id: 'a', comingSoon: true };
    const b = { id: 'b', comingSoon: false };
    const c = { id: 'c', comingSoon: true };
    const d = { id: 'd', comingSoon: false };
    expect(openFirst([a, b, c, d]).map((s) => s.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
  });

  it('reads the console’s filter from ?light=, anything else all', () => {
    expect(lightFilterOf('red')).toBe('red');
    expect(lightFilterOf('green')).toBe('green');
    expect(lightFilterOf(null)).toBe('all');
    expect(lightFilterOf('blue')).toBe('all');
    expect(matchesLight({ comingSoon: true }, 'red')).toBe(true);
    expect(matchesLight({}, 'red')).toBe(false);
    expect(matchesLight({}, 'all')).toBe(true);
  });
});

describe('the song page', () => {
  it('opens a green song, and counts the visit', () => {
    openPage('ready');
    expect(screen.getByTestId('song-page')).toHaveTextContent('Ready Song');
    expect(recordView).toHaveBeenCalledWith('ready');
  });

  it('is Coming soon for a red song, by any link, and counts no visit', () => {
    openPage('red');
    expect(screen.queryByTestId('song-page')).toBeNull();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Red Song' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to Song Library' }),
    ).toBeInTheDocument();
    expect(recordView).not.toHaveBeenCalled();
  });

  it('opens a red song in the console, so its chart can be fixed', () => {
    openPage('red', true);
    expect(screen.getByTestId('song-page')).toHaveTextContent('Red Song');
  });
});
