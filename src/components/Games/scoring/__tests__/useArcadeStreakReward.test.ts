// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { StrictMode, createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArcadeStreakReward } from '../useArcadeStreakReward';

const award = vi.fn();
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardArcadeExperience: () => ({ mutateAsync: award }),
}));
vi.mock('@/lib/challenges/eventBus', () => ({
  reportChallengeEvent: () => {},
}));

const strict = ({ children }: { children: ReactNode }) =>
  createElement(StrictMode, null, children);

beforeEach(() => {
  award.mockReset();
});

describe('useArcadeStreakReward', () => {
  it('awards XP once for five in a row, and reports the win with its XP', async () => {
    award.mockResolvedValue({
      awarded: true,
      awardedExperience: 10,
      reason: 'granted',
    });
    const { result } = renderHook(() => useArcadeStreakReward('chroma'), {
      wrapper: strict,
    });
    for (let i = 0; i < 4; i++) act(() => result.current.registerCorrect());
    expect(result.current.streak).toBe(4);
    expect(result.current.win).toBeNull();

    await act(async () => {
      result.current.registerCorrect();
    });
    expect(award).toHaveBeenCalledTimes(1);
    expect(result.current.streak).toBe(0);
    expect(result.current.win).toEqual({ id: 1, status: 'granted', xp: 10 });
    expect(result.current.sessionXp).toBe(10);
  });

  it('says so when today’s Arcade XP is all earned, or the award fails', async () => {
    award.mockResolvedValueOnce({
      awarded: false,
      awardedExperience: 0,
      reason: 'daily_cap_reached',
    });
    award.mockRejectedValueOnce(new Error('Not authenticated'));
    const { result } = renderHook(() => useArcadeStreakReward());
    await act(async () => {
      for (let i = 0; i < 5; i++) result.current.registerCorrect();
    });
    expect(result.current.win?.status).toBe('capped');
    await act(async () => {
      for (let i = 0; i < 5; i++) result.current.registerCorrect();
    });
    expect(result.current.win).toMatchObject({ id: 2, status: 'failed' });
    expect(result.current.sessionXp).toBe(0);
  });

  it('starts over on a wrong answer', () => {
    const { result } = renderHook(() => useArcadeStreakReward());
    act(() => result.current.registerCorrect());
    act(() => result.current.registerCorrect());
    act(() => result.current.registerWrong());
    expect(result.current.streak).toBe(0);
    for (let i = 0; i < 4; i++) act(() => result.current.registerCorrect());
    expect(award).not.toHaveBeenCalled();
  });
});
