// @vitest-environment jsdom
/**
 * The songs marquee's hand-scrolled mode (Home's Songs row): every artist
 * with artwork, once, one random song of theirs (owner, 2026-10-23), not a
 * batch of 30 nor the drifting ticker's doubled loop; no drift animation, a
 * new random order on each load, and arrow buttons that page the strip.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { SongsMarquee } from '../SongsMarquee';

const h = vi.hoisted(() => ({ songs: [] as Song[] }));

vi.mock('@/curriculum/data/songs', () => ({
  getAllSongs: () => h.songs,
  getSong: (id: string) => h.songs.find((s) => s.id === id) ?? null,
}));
vi.mock('@/components/songLibrary/SongCard', () => ({
  SongCard: ({ song }: { song: Song }) => (
    <div data-testid="song-card">{song.id}</div>
  ),
}));

// 48 artists, three songs each; every fourth artist has no artwork, so 36
// can show (more than the ticker's batch of 30). Song 0's artist is spelt
// with other caps and spacing, and is still artist 0.
const ARTISTS = 48;
const SHOWN = 36;
const artistOf = (i: number) => Math.floor(i / 3);
const song = (i: number) =>
  ({
    id: `song-${i}`,
    artist: i === 0 ? '  ARTIST   0 ' : `Artist ${artistOf(i)}`,
    artistImageRef:
      artistOf(i) % 4 === 3 ? undefined : `/artists/svg/artist-${i}.svg`,
  }) as Song;
const songById = (id: string | null) =>
  h.songs.find((s) => s.id === id) as Song;

const shownIds = () =>
  screen.getAllByTestId('song-card').map((el) => el.textContent);

beforeEach(() => {
  h.songs = Array.from({ length: ARTISTS * 3 }, (_, i) => song(i));
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SongsMarquee scrollable', () => {
  it('shows every artist with artwork once, in a scroller with no drifting track', () => {
    const { container } = render(<SongsMarquee scrollable bleed={false} />);
    const shown = shownIds().map(songById);
    expect(shown).toHaveLength(SHOWN);
    // No artist twice, whatever the spelling, and no song without artwork.
    expect(
      new Set(shown.map((s) => artistOf(Number(s.id.slice(5))))).size,
    ).toBe(SHOWN);
    expect(shown.every((s) => s.artistImageRef)).toBe(true);
    expect(container.querySelector('.song-marquee-track')).toBeNull();
    expect(screen.getByTestId('songs-scroller')).toBeTruthy();
  });

  it('comes in a new order on each load', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 5; i++) {
      render(<SongsMarquee scrollable bleed={false} />);
      orders.add(shownIds().join(','));
      cleanup();
    }
    // 36! orders: five loads all alike would be a broken shuffle.
    expect(orders.size).toBeGreaterThan(1);
  });

  it('pages the strip with its arrows', () => {
    render(<SongsMarquee scrollable bleed={false} />);
    const scroller = screen.getByTestId('songs-scroller');
    // jsdom lays nothing out: a strip wider than its view.
    Object.defineProperty(scroller, 'clientWidth', { value: 1000 });
    Object.defineProperty(scroller, 'scrollWidth', { value: 3600 });
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;
    fireEvent.scroll(scroller);
    fireEvent.click(screen.getByRole('button', { name: 'Scroll songs right' }));
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: 800 }),
    );
  });

  it('keeps the drifting ticker’s batch of 30, doubled, when not scrollable', () => {
    const { container } = render(<SongsMarquee bleed={false} />);
    expect(shownIds()).toHaveLength(60);
    expect(container.querySelector('.song-marquee-track')).not.toBeNull();
  });
});
