// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArcadeStreakContext,
  StreakStrip,
  WIN_MS,
  type ArcadeStreakState,
} from '../ArcadeStreak';
import type { StreakWin } from '../useArcadeStreakReward';

const sounds: string[] = [];
vi.mock('@/lib/uiSounds', () => ({
  playSound: (name: string) => sounds.push(name),
}));

const strip = (
  state: Partial<ArcadeStreakState> & { win?: StreakWin | null },
) => (
  <ArcadeStreakContext.Provider
    value={{ count: 0, target: 5, win: null, sessionXp: 0, ...state }}
  >
    <StreakStrip />
  </ArcadeStreakContext.Provider>
);

beforeEach(() => {
  vi.useFakeTimers();
  sounds.length = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the streak strip', () => {
  it('shows the streak and the goal, under every game’s header', () => {
    render(strip({ count: 3, sessionXp: 20 }));
    expect(
      screen.getByRole('status', { name: 'Streak 3 of 5' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5 in a row earns XP · +20 XP this visit'),
    ).toBeInTheDocument();
  });

  it('is nothing on a page that counts no streak', () => {
    const { container } = render(<StreakStrip />);
    expect(container.innerHTML).toBe('');
  });

  it('celebrates a won streak with its XP and the reward sound, then carries on', async () => {
    const { rerender } = render(strip({ count: 4 }));
    rerender(strip({ win: { id: 1, status: 'pending', xp: 0 } }));
    expect(screen.getByText('Streak complete!')).toBeInTheDocument();
    expect(screen.getByText('Earning XP…')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Streak 5 of 5' }),
    ).toBeInTheDocument();
    expect(sounds).toEqual(['reward']);

    rerender(
      strip({ win: { id: 1, status: 'granted', xp: 10 }, sessionXp: 10 }),
    );
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(sounds).toEqual(['reward']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WIN_MS + 100);
    });
    expect(screen.queryByText('Streak complete!')).toBeNull();
    expect(
      screen.getByRole('status', { name: 'Streak 0 of 5' }),
    ).toBeInTheDocument();
  });

  it('says so when today’s Arcade XP is all earned', () => {
    const { rerender } = render(strip({}));
    rerender(strip({ win: { id: 1, status: 'capped', xp: 0 } }));
    expect(
      screen.getByText(
        'Today’s Arcade XP is all earned. Keep playing for practice!',
      ),
    ).toBeInTheDocument();
  });

  it('stays quiet for a game that sounds its own win', () => {
    const { rerender } = render(strip({ ownWinSound: true }));
    rerender(
      strip({ ownWinSound: true, win: { id: 1, status: 'pending', xp: 0 } }),
    );
    expect(screen.getByText('Streak complete!')).toBeInTheDocument();
    expect(sounds).toEqual([]);
  });

  it('doesn’t celebrate a win from before the game opened', () => {
    render(strip({ win: { id: 2, status: 'granted', xp: 10 } }));
    expect(screen.queryByText('Streak complete!')).toBeNull();
    expect(sounds).toEqual([]);
  });
});
