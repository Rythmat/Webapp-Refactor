// @vitest-environment jsdom
/**
 * A module reports completion only for the activity it was launched for
 * (practice-tutorial-09). The tab stashes a slide's launch and keeps it, so
 * a Studio lesson finished later in the same tab, for no slide or another
 * one, must not answer the slide's interaction.
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendMspLaunchParams,
  launchIsFor,
  studioTutorialActivityRef,
  type MspActivity,
  type MspLaunchParams,
} from './mspLaunchParams';
import { readMspInboxForUser } from './mspResponseInbox';
import { useMspModuleCompletion } from './useMspModuleCompletion';

vi.mock('@/hooks/data', () => ({ useMe: () => ({ data: { id: 'acct-1' } }) }));

const LAUNCH: MspLaunchParams = {
  interactionId: 'ix-1',
  enrollmentId: 'enr-1',
  module: 'studio',
  activityRef: studioTutorialActivityRef('make-first-track'),
  expects: 'completion',
};

const entries = () => Object.values(readMspInboxForUser('acct-1').entries);

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(
    {},
    '',
    appendMspLaunchParams('/studio/editor?tutorial=make-first-track', LAUNCH),
  );
});
afterEach(cleanup);

describe('launchIsFor', () => {
  it('matches the module and the activity', () => {
    const lesson: MspActivity = {
      module: 'studio',
      activityRef: LAUNCH.activityRef,
    };
    expect(launchIsFor(LAUNCH, lesson)).toBe(true);
    expect(
      launchIsFor(LAUNCH, {
        module: 'studio',
        activityRef: studioTutorialActivityRef('jazz-color-your-chords'),
      }),
    ).toBe(false);
    expect(launchIsFor(LAUNCH, { ...lesson, module: 'learn' })).toBe(false);
    expect(launchIsFor(null, lesson)).toBe(false);
  });
});

describe('useMspModuleCompletion with an activity', () => {
  it('reports nothing for another lesson finished in the launched tab', () => {
    const { result } = renderHook(() => useMspModuleCompletion());
    result.current.reportCompletion(undefined, {
      module: 'studio',
      activityRef: studioTutorialActivityRef('jazz-color-your-chords'),
    });
    expect(entries()).toEqual([]);

    // The lesson the slide launched still reports, once.
    result.current.reportCompletion(undefined, {
      module: 'studio',
      activityRef: LAUNCH.activityRef,
    });
    result.current.reportCompletion(undefined, {
      module: 'studio',
      activityRef: LAUNCH.activityRef,
    });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({
      interactionId: 'ix-1',
      activityRef: LAUNCH.activityRef,
      payload: { kind: 'completion', completed: true },
    });
  });

  it('reports nothing from a later mount reading another lesson’s stash', () => {
    // The launch was stashed by an earlier mount; the URL has moved on.
    renderHook(() => useMspModuleCompletion()).unmount();
    window.history.replaceState({}, '', '/studio/editor');
    const { result } = renderHook(() => useMspModuleCompletion());
    result.current.reportCompletion(undefined, {
      module: 'studio',
      activityRef: studioTutorialActivityRef('house-make-it-pump'),
    });
    expect(entries()).toEqual([]);
  });

  it('reports as before without an activity (Learn, Genre, the Globe)', () => {
    const { result } = renderHook(() => useMspModuleCompletion());
    result.current.reportCompletion();
    expect(entries()).toHaveLength(1);
  });
});
