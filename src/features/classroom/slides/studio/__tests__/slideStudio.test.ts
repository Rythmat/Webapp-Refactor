// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Interaction } from '../../../types';
import type { Slide } from '../../types';
import {
  SLIDE_STUDIO_KEY,
  SLIDE_STUDIO_STATE,
  SLIDE_STUDIO_STEP,
  isSlideStudioKey,
  isSlideStudioState,
  isSlideStudioStep,
  slideStudioSrc,
  studioTutorialOf,
} from '../slideStudio';
import { connectSlideStudio, type TutorialState } from '../slideStudioBridge';

const atlas = (module: string, activityRef: string): Interaction =>
  ({
    id: 'i1',
    type: 'atlas',
    question: { en: 'Follow along' },
    shareable: false,
    atlas: { module, activityRef, expects: 'completion', follow: true },
  }) as Interaction;

const appRoute = {
  id: 's-group',
  kind: 'app-route',
  phase: 'groupPractice',
  title: { en: 'Producer' },
  interactionId: 'i1',
} as unknown as Slide;

describe('the Group Practice slide’s tutorial', () => {
  it('is the Studio tutorial an app-route slide launches', () => {
    expect(
      studioTutorialOf(appRoute, [
        atlas('studio', 'studio:tutorial:rnb-mix-and-polish'),
      ]),
    ).toBe('rnb-mix-and-polish');
  });

  it('is nothing for any other activity or slide', () => {
    expect(
      studioTutorialOf(appRoute, [atlas('learn', 'learn:lesson:x')]),
    ).toBeNull();
    expect(
      studioTutorialOf(appRoute, [atlas('studio', 'studio:project:new')]),
    ).toBeNull();
    expect(
      studioTutorialOf(appRoute, [atlas('studio', 'studio:tutorial:a/../b')]),
    ).toBeNull();
    expect(studioTutorialOf(appRoute, [])).toBeNull();
    expect(
      studioTutorialOf({ ...appRoute, kind: 'content' } as unknown as Slide, [
        atlas('studio', 'studio:tutorial:x'),
      ]),
    ).toBeNull();
  });
});

describe('the frame’s address', () => {
  it('opens the tutorial alone outside a session', () => {
    expect(slideStudioSrc('studio-basics')).toBe(
      '/studio/slide?tutorial=studio-basics',
    );
  });

  it('leads the class from Present, and watches it on the room’s screen', () => {
    const lead = new URLSearchParams(
      slideStudioSrc('x', { sessionId: 's1', lead: true }).split('?')[1],
    );
    expect(Object.fromEntries(lead)).toEqual({
      tutorial: 'x',
      follow: '1',
      session: 's1',
      activityRef: 'studio:tutorial:x',
      lead: '1',
    });
    const watch = new URLSearchParams(
      slideStudioSrc('x', { sessionId: 's1', lead: false }).split('?')[1],
    );
    expect(watch.get('watch')).toBe('1');
    expect(watch.has('lead')).toBe(false);
  });
});

describe('the messages', () => {
  it('accept only well-formed steps and states', () => {
    expect(isSlideStudioStep({ type: SLIDE_STUDIO_STEP, at: 2 })).toBe(true);
    expect(isSlideStudioStep({ type: SLIDE_STUDIO_STEP, at: -1 })).toBe(false);
    expect(isSlideStudioStep({ type: SLIDE_STUDIO_STEP, at: 1.5 })).toBe(false);
    expect(isSlideStudioStep({ type: 'other', at: 1 })).toBe(false);
    expect(
      isSlideStudioState({ type: SLIDE_STUDIO_STATE, step: 0, total: 14 }),
    ).toBe(true);
    expect(
      isSlideStudioState({ type: SLIDE_STUDIO_STATE, step: 0, total: 0 }),
    ).toBe(false);
  });

  it('carry the keys that move the lesson, and no others', () => {
    for (const key of ['PageDown', 'PageUp', 'ArrowRight', 'ArrowLeft'])
      expect(isSlideStudioKey({ type: SLIDE_STUDIO_KEY, key })).toBe(true);
    for (const key of ['ArrowUp', 'Escape', ' '])
      expect(isSlideStudioKey({ type: SLIDE_STUDIO_KEY, key })).toBe(false);
  });
});

/** A tutorial store, a host window and its slide, in memory. */
const rig = (booted: boolean) => {
  const listeners = new Set<() => void>();
  let state: TutorialState = {
    activeTutorialId: booted ? 'rnb' : null,
    tutorialStepIndex: 0,
    goToTutorialStep: (index) => {
      state = { ...state, tutorialStepIndex: index };
      listeners.forEach((l) => l());
    },
  };
  const store = {
    getState: () => state,
    subscribe: (_s: unknown, listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const boot = () => {
    state = { ...state, activeTutorialId: 'rnb' };
    listeners.forEach((l) => l());
  };
  const host = new EventTarget() as unknown as Window;
  const parent = { postMessage: vi.fn() };
  const disconnect = connectSlideStudio({
    host,
    parent: parent as unknown as Window,
    origin: 'http://app',
    store,
    totalOf: (id) => (id === 'rnb' ? 14 : 0),
  });
  const send = (
    data: unknown,
    origin = 'http://app',
    source: unknown = parent,
  ) =>
    host.dispatchEvent(
      Object.assign(new Event('message'), { data, origin, source }),
    );
  return { state: () => state, parent, send, boot, host, disconnect };
};

describe('the framed Studio', () => {
  it('goes to the step its slide asks for, and says where it is', () => {
    const r = rig(true);
    expect(r.parent.postMessage).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STATE, step: 0, total: 14 },
      'http://app',
    );
    r.send({ type: SLIDE_STUDIO_STEP, at: 3 });
    expect(r.state().tutorialStepIndex).toBe(3);
    expect(r.parent.postMessage).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STATE, step: 3, total: 14 },
      'http://app',
    );
    // Past the last step: the last.
    r.send({ type: SLIDE_STUDIO_STEP, at: 40 });
    expect(r.state().tutorialStepIndex).toBe(13);
    r.disconnect();
  });

  it('ignores another origin or window', () => {
    const r = rig(true);
    r.send({ type: SLIDE_STUDIO_STEP, at: 3 }, 'http://evil');
    r.send({ type: SLIDE_STUDIO_STEP, at: 3 }, 'http://app', {});
    expect(r.state().tutorialStepIndex).toBe(0);
    r.disconnect();
  });

  it('keeps a step asked for before the lesson boots', () => {
    const r = rig(false);
    expect(r.parent.postMessage).not.toHaveBeenCalled();
    r.send({ type: SLIDE_STUDIO_STEP, at: 2 });
    r.boot();
    expect(r.state().tutorialStepIndex).toBe(2);
    expect(r.parent.postMessage).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STATE, step: 2, total: 14 },
      'http://app',
    );
    r.disconnect();
  });

  it('hands a clicker’s Page Down to the lesson at once', () => {
    const r = rig(true);
    r.parent.postMessage.mockClear();
    const down = new KeyboardEvent('keydown', {
      key: 'PageDown',
      cancelable: true,
    });
    r.host.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(r.parent.postMessage).toHaveBeenCalledWith(
      { type: SLIDE_STUDIO_KEY, key: 'PageDown' },
      'http://app',
    );
    r.disconnect();
  });

  it('hands on an arrow the Studio had no use for, and keeps the rest', () => {
    vi.useFakeTimers();
    const r = rig(true);
    r.parent.postMessage.mockClear();
    // Unused: the lesson moves.
    r.host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    vi.runAllTimers();
    expect(r.parent.postMessage).toHaveBeenCalledWith(
      { type: SLIDE_STUDIO_KEY, key: 'ArrowRight' },
      'http://app',
    );
    r.parent.postMessage.mockClear();
    // The Studio took it (a clip nudged): it stays.
    const taken = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      cancelable: true,
    });
    r.host.dispatchEvent(taken);
    taken.preventDefault();
    vi.runAllTimers();
    // With a modifier, or moving a caret in a field: it stays too.
    r.host.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }),
    );
    const field = document.createElement('textarea');
    document.body.appendChild(field);
    field.addEventListener('keydown', (e) => r.host.dispatchEvent(e), {
      once: true,
    });
    const typed = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    Object.defineProperty(typed, 'target', { value: field });
    r.host.dispatchEvent(typed);
    vi.runAllTimers();
    expect(r.parent.postMessage).not.toHaveBeenCalled();
    field.remove();
    r.disconnect();
    vi.useRealTimers();
  });
});
