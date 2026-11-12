// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { experienceApi } from '../api';
import {
  awardLearnXp,
  grantedBy,
  LEARN_XP,
  LEARN_XP_DAILY_CAP,
  resetLearnXpForTests,
  subscribeXpGains,
} from '../learnXp';

const TODAY = new Date(2026, 10, 2);
const TOMORROW = new Date(2026, 10, 3);

describe('a little XP for what’s done in Learn', () => {
  const award = vi.spyOn(experienceApi, 'awardAction');

  beforeEach(() => {
    localStorage.clear();
    resetLearnXpForTests();
    award.mockReset();
    award.mockResolvedValue({ awarded: true, awardedExperience: 1 });
  });
  afterEach(() => vi.clearAllMocks());

  it('asks for the small amount, by a source that names the thing done', async () => {
    await awardLearnXp('t', 'demo', 'pop:1:c:A1.1', undefined, TODAY);
    expect(award).toHaveBeenCalledWith('t', {
      source: 'learn:demo:pop:1:c:A1.1',
      amount: LEARN_XP.demo,
    });
  });

  it('counts each thing once a day, and again the next', async () => {
    await awardLearnXp('t', 'demo', 'x', undefined, TODAY);
    expect(await awardLearnXp('t', 'demo', 'x', undefined, TODAY)).toBeNull();
    expect(award).toHaveBeenCalledTimes(1);
    await awardLearnXp('t', 'practice', 'x', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'y', undefined, TODAY);
    expect(award).toHaveBeenCalledTimes(3);
    await awardLearnXp('t', 'demo', 'x', undefined, TOMORROW);
    expect(award).toHaveBeenCalledTimes(4);
  });

  it('stops asking at the day’s cap', async () => {
    const passes = Math.floor(LEARN_XP_DAILY_CAP / LEARN_XP.pass);
    for (let i = 0; i < passes; i++) {
      await awardLearnXp('t', 'pass', `s${i}`, undefined, TODAY);
    }
    expect(award).toHaveBeenCalledTimes(passes);
    await awardLearnXp('t', 'pass', 'over', undefined, TODAY);
    expect(award).toHaveBeenCalledTimes(passes);
  });

  it('asks nothing without a sign-in', async () => {
    expect(await awardLearnXp(null, 'demo', 'x', undefined, TODAY)).toBeNull();
    expect(award).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    'stops asking for the session after a %i',
    async (status) => {
      // As the API client words it.
      award.mockRejectedValue(
        new Error(`POST /api/experience/award failed (${status}): no`),
      );
      expect(await awardLearnXp('t', 'demo', 'a', undefined, TODAY)).toBeNull();
      await awardLearnXp('t', 'demo', 'b', undefined, TODAY);
      expect(award).toHaveBeenCalledTimes(1);
    },
  );

  it('can ask again after a failure that wasn’t a refusal', async () => {
    award.mockRejectedValueOnce(new Error('offline'));
    await awardLearnXp('t', 'demo', 'a', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'a', undefined, TODAY);
    expect(award).toHaveBeenCalledTimes(2);
  });

  it('keeps asking after a server error', async () => {
    award.mockRejectedValueOnce(
      new Error('POST /api/experience/award failed (500): oops'),
    );
    await awardLearnXp('t', 'demo', 'a', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'b', undefined, TODAY);
    expect(award).toHaveBeenCalledTimes(2);
  });

  it('takes an empty reply as nothing granted, and doesn’t ask again', async () => {
    award.mockResolvedValue(undefined);
    const onReply = vi.fn();
    expect(await awardLearnXp('t', 'demo', 'a', onReply, TODAY)).toBeNull();
    await awardLearnXp('t', 'demo', 'a', onReply, TODAY);
    expect(onReply).not.toHaveBeenCalled();
    expect(award).toHaveBeenCalledTimes(1);
  });

  it('only shows what the server says it granted', async () => {
    const gains: number[] = [];
    subscribeXpGains((gain) => gains.push(gain));
    award.mockResolvedValueOnce({ awarded: true, awardedExperience: 2 });
    award.mockResolvedValueOnce({ awarded: false, awardedExperience: 2 });
    award.mockResolvedValueOnce({});
    award.mockResolvedValueOnce({ awardedExperience: 0 });
    await awardLearnXp('t', 'demo', 'a', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'b', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'c', undefined, TODAY);
    await awardLearnXp('t', 'demo', 'd', undefined, TODAY);
    expect(gains).toEqual([2]);
  });

  it('shows the server’s amount, not the one it asked for', () => {
    expect(grantedBy({ awardedExperience: 50 })).toBe(50);
    expect(grantedBy(null)).toBeNull();
  });
});
