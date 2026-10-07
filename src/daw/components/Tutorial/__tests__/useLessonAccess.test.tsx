// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLessonAccess } from '../useLessonAccess';

/**
 * The rule the Production tab and the editor's `?tutorial=` boot apply to a
 * lesson (owner decision 8, audit ia-flows-14): a free student is turned
 * away from a Premium lesson, a premium student never is, and nobody is
 * judged while the plan is unknown, since the editor consumes the link when
 * it decides.
 */

const plan = vi.hoisted(() => ({
  premium: { isPremium: false, isLoading: false },
  auth: { isAuth0Authenticated: true, token: 'token' as string | null },
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => plan.premium,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => plan.auth,
}));

const PREMIUM_LESSON = 'make-first-track';
const FREE_LESSON = 'hiphop-build-the-beat';

const accessOf = () => renderHook(() => useLessonAccess()).result.current;

beforeEach(() => {
  plan.premium = { isPremium: false, isLoading: false };
  plan.auth = { isAuth0Authenticated: true, token: 'token' };
});

describe('useLessonAccess', () => {
  it('waits on a Premium lesson while the subscription loads', () => {
    // useIsPremium says false for everyone until then.
    plan.premium = { isPremium: false, isLoading: true };
    expect(accessOf()(PREMIUM_LESSON)).toBe('wait');
  });

  it('turns a free student away from a Premium lesson', () => {
    expect(accessOf()(PREMIUM_LESSON)).toBe('upgrade');
  });

  it('opens a Premium lesson for a premium student', () => {
    plan.premium = { isPremium: true, isLoading: false };
    expect(accessOf()(PREMIUM_LESSON)).toBe('open');
  });

  it('opens a free lesson for a free student, loading or not', () => {
    expect(accessOf()(FREE_LESSON)).toBe('open');
    plan.premium = { isPremium: false, isLoading: true };
    expect(accessOf()(FREE_LESSON)).toBe('open');
  });

  it('waits while a signed-in student has no token yet', () => {
    // The subscription query is off without a token, so useIsPremium reads
    // "not loading, not premium" then.
    plan.auth = { isAuth0Authenticated: true, token: null };
    expect(accessOf()(PREMIUM_LESSON)).toBe('wait');
    expect(accessOf()(FREE_LESSON)).toBe('open');
  });

  it('turns away a visitor who is not signed in', () => {
    plan.auth = { isAuth0Authenticated: false, token: null };
    expect(accessOf()(PREMIUM_LESSON)).toBe('upgrade');
  });

  it('leaves an unknown lesson to the boot, which says it was not found', () => {
    expect(accessOf()('no-such-lesson')).toBe('open');
  });

  it('changes only when the answer can, so the boot runs again once the plan is known', () => {
    plan.premium = { isPremium: false, isLoading: true };
    const { result, rerender } = renderHook(() => useLessonAccess());
    const waiting = result.current;
    rerender();
    expect(result.current).toBe(waiting);

    plan.premium = { isPremium: true, isLoading: false };
    rerender();
    expect(result.current).not.toBe(waiting);
    expect(result.current(PREMIUM_LESSON)).toBe('open');
  });
});
