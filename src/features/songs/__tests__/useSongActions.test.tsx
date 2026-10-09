// @vitest-environment jsdom
/**
 * Open in Studio is a link (milestone 1.4): the editor opens the song itself
 * (openSession's 'song' intent), keeping the work it replaces. The Song
 * page's transposition rides along as `transpose`, and the editor rebuilds
 * the very chart the page shows from the song's id and that offset.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getAllSongs, ensureSongContent, getSong } from '@/content/songStore';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { studioSongUrl } from '../studioSongUrl';
import { useSongActions } from '../useSongActions';

vi.mock('@/hooks/useUISound', () => ({
  useUISound: () => ({ play: () => {} }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/songs/x']}>{children}</MemoryRouter>
);

function openInStudio(song: Song, transpose?: number): string {
  const { result } = renderHook(
    () => ({
      actions: useSongActions(
        song,
        transpose === undefined ? undefined : { transpose },
      ),
      location: useLocation(),
    }),
    { wrapper },
  );
  act(() => result.current.actions.openInStudio());
  return `${result.current.location.pathname}${result.current.location.search}`;
}

let song: Song;

beforeAll(async () => {
  await ensureSongContent();
  song = getAllSongs()[0];
});

afterEach(cleanup);

describe('studioSongUrl', () => {
  it('names the song, and the transposition when there is one', () => {
    expect(studioSongUrl('africa')).toBe('/studio/editor?song=africa');
    expect(studioSongUrl('africa', 0)).toBe('/studio/editor?song=africa');
    expect(studioSongUrl('africa', 2)).toBe(
      '/studio/editor?song=africa&transpose=2',
    );
    expect(studioSongUrl('africa', -11)).toBe(
      '/studio/editor?song=africa&transpose=-11',
    );
  });

  it('folds whole octaves away and encodes the id', () => {
    expect(studioSongUrl('a b', 12)).toBe('/studio/editor?song=a%20b');
    expect(studioSongUrl('x', 14)).toBe('/studio/editor?song=x&transpose=2');
    expect(studioSongUrl('x', Number.NaN)).toBe('/studio/editor?song=x');
  });
});

describe('useSongActions.openInStudio', () => {
  it('navigates to the editor’s song link', () => {
    expect(openInStudio(song)).toBe(studioSongUrl(song.id));
  });

  it('carries the Song page’s transposition', () => {
    const shown = transposeSong(song, 2);
    expect(openInStudio(shown, 2)).toBe(
      `/studio/editor?song=${encodeURIComponent(song.id)}&transpose=2`,
    );
  });

  it('no longer offers a prompt to render', () => {
    const { result } = renderHook(() => useSongActions(song), { wrapper });
    expect('studioPrompt' in result.current).toBe(false);
  });
});

describe('the transposed chart the editor rebuilds', () => {
  it('is the chart the Song page shows, for every offset', () => {
    for (const n of [-11, -5, -1, 0, 1, 2, 7, 11]) {
      // The Song page: displaySong = transposeSong(song, semitones).
      const displaySong = transposeSong(song, n);
      // The editor: the song looked up by the link's id, moved by its n.
      const url = new URL(studioSongUrl(displaySong.id, n), 'https://app.test');
      const rebuilt = transposeSong(
        getSong(url.searchParams.get('song')!)!,
        Number(url.searchParams.get('transpose') ?? 0),
      );
      expect(rebuilt).toEqual(displaySong);
      expect(rebuilt.keyRoot).toBe(displaySong.keyRoot);
    }
  });
});
