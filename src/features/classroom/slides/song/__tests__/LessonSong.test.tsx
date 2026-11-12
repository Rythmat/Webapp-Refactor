// @vitest-environment jsdom
/**
 * The lesson's song (owner, 2026-11-12): one player for the deck, so the
 * song the portrait started plays on into the next slide's video.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LessonSongProvider,
  SONG_GRACE_MS,
  useLessonSong,
} from '../LessonSong';

const player = {
  ids: [] as (string | null | undefined)[],
  plays: 0,
  pauses: 0,
};

vi.mock('@/hooks/media/useYouTubeIframePlayer', async () => {
  const React = await import('react');
  return {
    useYouTubeIframePlayer: ({ videoId }: { videoId?: string | null }) => {
      const [playing, setPlaying] = React.useState(false);
      const ref = React.useRef<HTMLDivElement>(null);
      player.ids.push(videoId);
      return {
        containerRef: ref,
        isReady: Boolean(videoId),
        isPlaying: playing,
        play: () => {
          player.plays += 1;
          setPlaying(true);
        },
        pause: () => {
          player.pauses += 1;
          setPlaying(false);
        },
        seekTo: () => {},
      };
    },
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  player.ids = [];
  player.plays = 0;
  player.pauses = 0;
});

/** Slide 1: the portrait's pill. */
const Pill = () => {
  const song = useLessonSong('song', null);
  return (
    <button type="button" onClick={song?.toggle}>
      {song?.isPlaying ? 'pause' : 'play'}
    </button>
  );
};

/** Slide 2: the song's half. */
const Dock = () => {
  const [place, setPlace] = useState<HTMLDivElement | null>(null);
  const song = useLessonSong('song', place, { autoplay: true });
  return (
    <div ref={setPlace} data-testid="dock">
      {song?.isPlaying ? 'playing' : 'quiet'}
    </div>
  );
};

const Deck = ({ at }: { at: number }) => (
  <LessonSongProvider>
    {at === 1 ? <Pill /> : at === 2 ? <Dock /> : <p>slide {at}</p>}
  </LessonSongProvider>
);

/** The ids the player was handed, without repeats in a row. */
const players = () =>
  player.ids.filter((id, i, all) => id && id !== all[i - 1]);

describe('the lesson’s song', () => {
  it('plays on from the portrait’s pill into the next slide, one player', () => {
    const { rerender } = render(<Deck at={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    expect(screen.getByRole('button', { name: 'pause' })).toBeTruthy();

    rerender(<Deck at={2} />);
    expect(screen.getByTestId('dock').textContent).toBe('playing');
    expect(player.plays).toBe(1);
    expect(player.pauses).toBe(0);
    // Never handed back, never made again.
    expect(players()).toEqual(['song']);
    expect(player.ids.slice(player.ids.indexOf('song'))).not.toContain(null);

    // Back to the portrait: still playing.
    rerender(<Deck at={1} />);
    expect(screen.getByRole('button', { name: 'pause' })).toBeTruthy();
  });

  it('pauses on a slide without it, after a grace for the next slide', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Deck at={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    rerender(<Deck at={3} />);
    act(() => vi.advanceTimersByTime(SONG_GRACE_MS - 50));
    expect(player.pauses).toBe(0);
    act(() => vi.advanceTimersByTime(100));
    expect(player.pauses).toBe(1);
  });

  it('starts on the song’s slide when the lesson opens there', () => {
    render(<Deck at={2} />);
    expect(screen.getByTestId('dock').textContent).toBe('playing');
    expect(players()).toEqual(['song']);
  });

  it('is nobody’s outside a deck: a slide keeps its own player', () => {
    render(<Pill />);
    // No shared song to drive: the control has nothing to toggle.
    expect(screen.getByRole('button', { name: 'play' })).toBeTruthy();
    expect(player.ids).toEqual([]);
  });
});
