// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Focus } from '../../../presentation/Focus';
import type { Interaction } from '../../../types';
import { SlideRenderer } from '../../SlideRenderer';
import { SlideStudio } from '../../parts/SlideStudio';
import type { Slide, SlideSurface } from '../../types';
import {
  SLIDE_STUDIO_KEY,
  SLIDE_STUDIO_STATE,
  SLIDE_STUDIO_STEP,
} from '../slideStudio';

afterEach(cleanup);

const frameOf = () =>
  document.querySelector<HTMLIFrameElement>('iframe[title="Studio"]');

/** A message from the frame, as the slide hears it. */
const fromFrame = (data: unknown) =>
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: window.location.origin,
        source: frameOf()!.contentWindow,
      }),
    );
  });

const press = (key: string) =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });

const groupSlide = {
  id: 's-group',
  kind: 'app-route',
  phase: 'groupPractice',
  section: 'groupProject',
  presetId: 'hero',
  title: { en: 'Producer' },
  interactionId: 'i1',
} as unknown as Slide;
const groupInteractions = [
  {
    id: 'i1',
    type: 'atlas',
    question: { en: 'Follow along' },
    shareable: false,
    atlas: {
      module: 'studio',
      activityRef: 'studio:tutorial:rnb-mix-and-polish',
      expects: 'completion',
      follow: true,
    },
  } as Interaction,
];

describe('Present, driven by the arrow keys', () => {
  const present = () => {
    const nav = {
      next: vi.fn(),
      prev: vi.fn(),
      exit: vi.fn(),
      goTo: vi.fn(),
    };
    render(
      <Focus
        slide={groupSlide}
        language="en"
        interactions={groupInteractions}
        onExit={nav.exit}
        onPrev={nav.prev}
        onNext={nav.next}
        hasPrev
        hasNext
        index={3}
        count={9}
        onGoTo={nav.goTo}
      />,
    );
    return nav;
  };

  it('shows only the slide and its step and page selector', () => {
    present();
    const selector = screen.getByRole('navigation', {
      name: 'Lesson position',
    });
    expect(selector.textContent).toBe('4 / 9');
    // Once the Studio says where it is, its step joins the page.
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 1, total: 14 });
    expect(selector.textContent).toBe('Step 2 / 144 / 9');
    // Nothing else on Present takes a click.
    expect(
      screen
        .getAllByRole('button')
        .every((b) => selector.contains(b) || b.closest('iframe')),
    ).toBe(true);
  });

  it('moves with its arrows as the keys do, and jumps to a page', () => {
    const nav = present();
    const post = vi.spyOn(frameOf()!.contentWindow!, 'postMessage');
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 13, total: 14 });
    act(() => screen.getByRole('button', { name: 'Back' }).click());
    expect(post).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 12 },
      window.location.origin,
    );
    act(() => screen.getByRole('button', { name: 'Next' }).click());
    expect(nav.next).toHaveBeenCalledTimes(1);
    act(() => screen.getByRole('button', { name: /^Page 4 of 9/ }).click());
    act(() => screen.getByRole('menuitem', { name: '7' }).click());
    expect(nav.goTo).toHaveBeenCalledWith(6);
  });

  it('moves through the tutorial’s steps, then on to the next slide', () => {
    const nav = present();
    const post = vi.spyOn(frameOf()!.contentWindow!, 'postMessage');
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 12, total: 14 });
    press('ArrowRight');
    expect(post).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 13 },
      window.location.origin,
    );
    expect(nav.next).not.toHaveBeenCalled();
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 13, total: 14 });
    press('ArrowRight');
    expect(nav.next).toHaveBeenCalledTimes(1);
    press('ArrowLeft');
    expect(post).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 12 },
      window.location.origin,
    );
    expect(nav.prev).not.toHaveBeenCalled();
  });

  it('back from the first step goes to the slide before', () => {
    const nav = present();
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 0, total: 14 });
    press('ArrowLeft');
    expect(nav.prev).toHaveBeenCalledTimes(1);
  });

  it('hears the arrows the Studio passes on, and a clicker’s keys', () => {
    const nav = present();
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 13, total: 14 });
    fromFrame({ type: SLIDE_STUDIO_KEY, key: 'ArrowRight' });
    fromFrame({ type: SLIDE_STUDIO_KEY, key: 'PageDown' });
    expect(nav.next).toHaveBeenCalledTimes(2);
  });
});

describe('SlideStudio in a session', () => {
  it('leads the class, and follows the teacher’s panel once', () => {
    const ui = (step?: number) => (
      <SlideStudio
        tutorialId="rnb"
        follow={{ sessionId: 's1', lead: true, step }}
      />
    );
    const { rerender } = render(ui(0));
    expect(frameOf()!.getAttribute('src')).toContain('lead=1');
    const post = vi.spyOn(frameOf()!.contentWindow!, 'postMessage');
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 0, total: 14 });
    expect(post).not.toHaveBeenCalled();
    // The panel moves the class: the Studio goes there, once.
    rerender(ui(4));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 4 },
      window.location.origin,
    );
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 4, total: 14 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('on the room’s screen, watches the class’s step, untouched', () => {
    render(
      <SlideStudio
        tutorialId="rnb"
        follow={{ sessionId: 's1', lead: true, step: 2 }}
        inert
      />,
    );
    const src = frameOf()!.getAttribute('src')!;
    expect(src).toContain('watch=1');
    expect(src).not.toContain('lead=1');
    expect(frameOf()!.className).toContain('pointer-events-none');
  });
});

describe('the Group Practice slide on each surface', () => {
  const slide = groupSlide;
  const interactions = groupInteractions;
  const show = (surface: SlideSurface, still = false) =>
    render(
      <SlideRenderer
        slide={slide}
        surface={surface}
        language="en"
        interactions={interactions}
        still={still}
        slots={{ launch: () => <button type="button">Launch</button> }}
      />,
    );

  it.each(['present', 'projector'] as const)('is the Studio on %s', (s) => {
    show(s);
    expect(frameOf()!.getAttribute('src')).toContain(
      'tutorial=rnb-mix-and-polish',
    );
  });

  it('is the tutorial’s card and launch on a student’s device', () => {
    show('student');
    expect(frameOf()).toBeNull();
    expect(screen.getByRole('button', { name: 'Launch' })).toBeTruthy();
  });

  it('boots no Studio in a thumbnail', () => {
    show('projector', true);
    expect(frameOf()).toBeNull();
  });
});
