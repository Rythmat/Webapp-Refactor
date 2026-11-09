// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Chroma from '../chroma';
import { ArcadeStreakContext } from '../scoring/ArcadeStreak';
import type { StreakWin } from '../scoring/useArcadeStreakReward';

/** Every note the game asked the lead for, in order. */
const played: number[] = [];

vi.mock('../chromaSound', () => ({
  useChromaSound: () => ({
    ready: true,
    play: (midi: number) => played.push(midi),
  }),
}));
// The header's back button needs a router, and isn't under test.
vi.mock('../ArcadeGameHeader', () => ({ ArcadeGameHeader: () => null }));

const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(8000);
  });

const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.useFakeTimers();
  // Each pick takes the first interval left: unison, then ♭2, then 2.
  vi.spyOn(Math, 'random').mockReturnValue(0);
  played.length = 0;
  try {
    localStorage.clear();
  } catch {
    // jsdom always has it.
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('a Level 3 round of Chroma', () => {
  it('plays the root before every interval note, on the same root', async () => {
    render(<Chroma />);
    click('Level 3');
    click('Start');
    await settle();
    expect(played).toEqual([60, 60, 60, 61, 60, 62]);
    expect(screen.getByText('Name the intervals')).toBeInTheDocument();
  });

  it('is named by number when the player chooses numbers', async () => {
    render(<Chroma />);
    click('Level 3');
    click('Numbers');
    expect(screen.getByRole('button', { name: '♯4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
    click('Start');
    await settle();

    played.length = 0;
    for (const name of ['1', '♭2', '2']) {
      click(name);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
    }
    await settle();
    expect(screen.getByText('Crystal attuned!')).toBeInTheDocument();
    // Each answer sounds as the root, then the interval chosen.
    expect(played).toEqual([60, 60, 60, 61, 60, 62]);
    // The choice is kept for the next visit.
    expect(localStorage.getItem('chroma-interval-naming')).toBe('numbers');
  });
});

describe('Chroma’s streak win', () => {
  const inStreak = (win: StreakWin | null) => (
    <ArcadeStreakContext.Provider
      value={{ count: 0, target: 5, win, sessionXp: 0, ownWinSound: true }}
    >
      <Chroma />
    </ArcadeStreakContext.Provider>
  );

  it('plays an arpeggio on the lead when a streak is won', async () => {
    const { rerender } = render(inStreak(null));
    rerender(inStreak({ id: 1, status: 'pending', xp: 0 }));
    // The XP arriving doesn't restart it.
    rerender(inStreak({ id: 1, status: 'granted', xp: 10 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(played).toEqual([72, 76, 79, 84]);
  });

  it('doesn’t celebrate a win from before the game opened', async () => {
    render(inStreak({ id: 3, status: 'granted', xp: 10 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(played).toEqual([]);
  });
});
