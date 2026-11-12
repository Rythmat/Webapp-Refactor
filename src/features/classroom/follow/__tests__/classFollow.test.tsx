// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY as SESSIONS_KEY } from '../../live/sessionsStore';
import { followLaunchForTab, readFollowParams } from '../classFollow';
import { useStepFollow } from '../useStepFollow';

const STASH = 'class-follow:launch:v1';
const REF = 'studio:tutorial:rnb';

const openAt = (search: string) =>
  window.history.replaceState(null, '', `/studio/slide${search}`);

/** The class tab's mirror of the session, the class on `step`. */
const classOn = (step: number) =>
  window.localStorage.setItem(
    `${SESSIONS_KEY}:teacher`,
    JSON.stringify({
      sessions: {
        s1: {
          id: 's1',
          status: 'live',
          activity: { slideId: 'g', ref: REF, step },
        },
      },
    }),
  );

const outbox = () =>
  window.localStorage.getItem('ma-teacher:class-follow:v1:s1');

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  openAt('');
});

describe('the follow launch', () => {
  it('reads the room’s screen as watching, never leading', () => {
    expect(
      readFollowParams('?follow=1&session=s1&lead=1&watch=1&activityRef=x'),
    ).toEqual({ sessionId: 's1', lead: false, watch: true, ref: 'x' });
    expect(readFollowParams('?follow=1&session=s1&lead=1')).toEqual({
      sessionId: 's1',
      lead: true,
    });
  });

  it('is stashed in its own tab, never from a frame', () => {
    openAt('?follow=1&session=s1&lead=1');
    expect(followLaunchForTab()?.lead).toBe(true);
    expect(window.sessionStorage.getItem(STASH)).not.toBeNull();

    window.sessionStorage.clear();
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
    expect(followLaunchForTab()?.lead).toBe(true);
    // A slide's Studio shares Present's sessionStorage: nothing left there.
    expect(window.sessionStorage.getItem(STASH)).toBeNull();
  });
});

describe('a Studio following the class', () => {
  const follow = (position: number, goTo = vi.fn()) =>
    renderHook(
      (p: { position: number }) =>
        useStepFollow({ ref: REF, position: p.position, total: 14, goTo }),
      { initialProps: { position } },
    );

  it('leading, joins the class where it is before leading it', () => {
    classOn(4);
    openAt(`?follow=1&session=s1&lead=1&activityRef=${REF}`);
    const goTo = vi.fn();
    const { rerender } = follow(0, goTo);
    // To the class's step, and the class is not taken back to the first.
    expect(goTo).toHaveBeenCalledWith(4);
    expect(outbox()).toBeNull();
    rerender({ position: 4 });
    expect(JSON.parse(outbox()!).note).toMatchObject({ kind: 'step', step: 4 });
    rerender({ position: 5 });
    expect(JSON.parse(outbox()!).note).toMatchObject({ kind: 'step', step: 5 });
  });

  it('leading a class not started yet, leads from its own step', () => {
    openAt(`?follow=1&session=s1&lead=1&activityRef=${REF}`);
    window.localStorage.setItem(
      `${SESSIONS_KEY}:teacher`,
      JSON.stringify({ sessions: { s1: { id: 's1', status: 'live' } } }),
    );
    follow(0);
    expect(JSON.parse(outbox()!).note).toMatchObject({ kind: 'step', step: 0 });
  });

  it('watching, follows the class and never reports or leads', () => {
    classOn(3);
    openAt(`?follow=1&session=s1&watch=1&activityRef=${REF}`);
    const goTo = vi.fn();
    const { result } = follow(0, goTo);
    expect(goTo).toHaveBeenCalledWith(3);
    result.current.finishStep();
    expect(outbox()).toBeNull();
  });
});
