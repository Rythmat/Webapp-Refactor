// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentControlsContext } from '../../../presentation/presentControls';
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

const presenting = (ui: React.ReactNode) => {
  const bar = document.createElement('div');
  document.body.appendChild(bar);
  render(
    <PresentControlsContext.Provider value={bar}>
      {ui}
    </PresentControlsContext.Provider>,
  );
  return bar;
};

describe('SlideStudio on Present', () => {
  it('puts the tutorial’s step on the slide bar, and moves it', () => {
    const bar = presenting(<SlideStudio tutorialId="rnb" />);
    expect(frameOf()!.getAttribute('src')).toBe('/studio/slide?tutorial=rnb');
    // No step until the Studio says where it is.
    expect(bar.textContent).toBe('');
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 2, total: 14 });
    expect(bar.textContent).toContain('Step 3 / 14');

    const post = vi.spyOn(frameOf()!.contentWindow!, 'postMessage');
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(post).toHaveBeenCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 3 },
      window.location.origin,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(post).toHaveBeenLastCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 1 },
      window.location.origin,
    );
  });

  it('leads the class in a session, and follows the teacher’s panel once', () => {
    const ui = (step?: number) => (
      <SlideStudio
        tutorialId="rnb"
        follow={{ sessionId: 's1', lead: true, step }}
      />
    );
    const bar = document.createElement('div');
    const { rerender } = render(
      <PresentControlsContext.Provider value={bar}>
        {ui(0)}
      </PresentControlsContext.Provider>,
    );
    expect(frameOf()!.getAttribute('src')).toContain('lead=1');
    const post = vi.spyOn(frameOf()!.contentWindow!, 'postMessage');
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 0, total: 14 });
    expect(post).not.toHaveBeenCalled();
    // The panel moves the class: the Studio goes there, once.
    rerender(
      <PresentControlsContext.Provider value={bar}>
        {ui(4)}
      </PresentControlsContext.Provider>,
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      { type: SLIDE_STUDIO_STEP, at: 4 },
      window.location.origin,
    );
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 4, total: 14 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('turns a clicker’s Page Down inside the Studio into the next slide', () => {
    presenting(<SlideStudio tutorialId="rnb" />);
    const keys: string[] = [];
    const onKey = (e: KeyboardEvent) => keys.push(e.key);
    document.addEventListener('keydown', onKey);
    fromFrame({ type: SLIDE_STUDIO_KEY, key: 'PageDown' });
    document.removeEventListener('keydown', onKey);
    expect(keys).toEqual(['ArrowRight']);
  });
});

describe('SlideStudio on the room’s screen', () => {
  it('watches the class’s step, untouched, with no step control', () => {
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
    fromFrame({ type: SLIDE_STUDIO_STATE, step: 0, total: 14 });
    expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull();
  });
});

describe('the Group Practice slide on each surface', () => {
  const slide = {
    id: 's-group',
    kind: 'app-route',
    phase: 'groupPractice',
    section: 'groupProject',
    presetId: 'hero',
    title: { en: 'Producer' },
    interactionId: 'i1',
  } as unknown as Slide;
  const interactions = [
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
