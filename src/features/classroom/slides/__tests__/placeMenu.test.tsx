// @vitest-environment jsdom
/**
 * The Individual Project's menu (owner, 2026-11-12): the six places as the
 * app's icons, three each side, named, each joined by a line to the Music
 * Atlas logo with a streak running into it.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlideRenderer } from '../SlideRenderer';
import { buildCortexLessonSkeleton } from '../cortex/buildDeck';
import { layoutPlaces } from '../parts/PlaceMenu';
import { PROJECT_PLACES } from '../projectPlaces';
import { resolveActivityRefHref } from '../resolveContentHref';
import type { Slide } from '../types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const projectSlide = (): Slide => {
  const slide = buildCortexLessonSkeleton('day-1').slides.find(
    (s) => s.section === 'individualProject',
  );
  if (!slide) throw new Error('no Individual Project slide');
  return slide;
};

const draw = (
  surface: 'student' | 'projector',
  more: { still?: boolean; layoutMode?: 'reflow' } = {},
) =>
  render(
    <SlideRenderer
      slide={projectSlide()}
      surface={surface}
      language="en"
      interactions={[]}
      {...more}
    />,
  ).container;

const NAMES = ['Learn', 'Songs', 'Library', 'Studio', 'Globe', 'Arcade'];

describe('where the six places sit', () => {
  it('runs three down each side, the logo between them', () => {
    const nodes = layoutPlaces(PROJECT_PLACES, 1152, 380);
    expect(nodes.map((n) => n.side)).toEqual([
      'left',
      'left',
      'left',
      'right',
      'right',
      'right',
    ]);
    const left = nodes.filter((n) => n.side === 'left');
    const right = nodes.filter((n) => n.side === 'right');
    // Level across, spread down, the columns either side of the middle.
    expect(left.map((n) => n.y)).toEqual(right.map((n) => n.y));
    expect(left[0]!.y).toBeLessThan(left[1]!.y);
    expect(left[1]!.y).toBe(190);
    expect(left[0]!.x).toBeLessThan(576);
    expect(right[0]!.x).toBeGreaterThan(576);
    // Each line ends at the logo's edge, level with its middle.
    for (const n of nodes) expect(n.path).toMatch(/ 190$/);
  });

  it('lays an older five-place lesson out three and two', () => {
    const nodes = layoutPlaces(PROJECT_PLACES.slice(0, 5), 1152, 380);
    expect(nodes.filter((n) => n.side === 'left')).toHaveLength(3);
    expect(nodes.filter((n) => n.side === 'right')).toHaveLength(2);
  });

  it('opens the Arcade from its tile', () => {
    const arcade = PROJECT_PLACES.find((p) => p.id === 'arcade');
    expect(arcade && resolveActivityRefHref(arcade.module, arcade.ref)).toBe(
      '/arcade',
    );
  });
});

describe('the Individual Project menu', () => {
  it('offers the six places as named icons around the logo, with lines', () => {
    const root = draw('student');
    const menus = root.querySelectorAll('[data-place-menu]');
    expect(menus).toHaveLength(1);
    const links = [...menus[0]!.querySelectorAll('a')];
    expect(links.map((a) => a.textContent)).toEqual(NAMES);
    expect(links.every((a) => a.target === '_blank')).toBe(true);
    expect(menus[0]!.querySelectorAll('[data-place] svg')).toHaveLength(6);
    expect(menus[0]!.querySelectorAll('[data-beam]')).toHaveLength(6);
    // The logo in the middle.
    expect(
      menus[0]!.querySelectorAll('svg[viewBox="0 0 129 128"]'),
    ).toHaveLength(1);
    // A streak on every line.
    expect(menus[0]!.querySelectorAll('.place-beam').length).toBe(12);
  });

  it('draws the line under a hand in the rainbow; the others finish, then start no more', () => {
    const root = draw('student');
    const studio = root.querySelectorAll('[data-place-menu] a')[3]!;
    const line = (id: string) =>
      root.querySelector(`[data-beam="${id}"] path`)!.getAttribute('stroke');
    const streaks = (id: string) => [
      ...root.querySelectorAll<SVGPathElement>(
        `[data-beam="${id}"] .place-beam`,
      ),
    ];
    const state = (id: string) =>
      streaks(id).map((p) => p.style.animationPlayState);
    const before = line('studio');
    fireEvent.pointerEnter(studio);
    // The whole line in the rainbow, flowing along it.
    expect(line('studio')).toMatch(/^url\(#.+-studio-flow\)$/);
    expect(
      root.querySelector('linearGradient[id$="-studio-flow"] animateTransform'),
    ).not.toBeNull();
    // A streak already on its way runs on into the logo…
    expect(state('learn')).toEqual(['running', 'running']);
    // …and at the end of its loop, where nothing shows, it stops there.
    fireEvent.animationIteration(streaks('learn')[1]!);
    expect(state('learn')).toEqual(['paused', 'paused']);
    // The line under the hand keeps flowing.
    fireEvent.animationIteration(streaks('studio')[1]!);
    expect(state('studio')).toEqual(['running', 'running']);
    fireEvent.pointerLeave(studio);
    expect(line('studio')).toBe(before);
    expect(state('learn')).toEqual(['running', 'running']);
  });

  it('is a picture on the room’s screen, nothing to click', () => {
    const root = draw('projector');
    expect(root.querySelectorAll('[data-place-menu] a')).toHaveLength(0);
    expect(root.querySelectorAll('[data-place-menu] button')).toHaveLength(0);
    expect(root.querySelectorAll('[data-place]')).toHaveLength(6);
  });

  it('runs no streaks in a thumbnail', () => {
    const root = draw('projector', { still: true });
    expect(root.querySelectorAll('[data-beam]')).toHaveLength(6);
    expect(root.querySelectorAll('.place-beam')).toHaveLength(0);
  });

  it('lists the six on a phone, without lines', () => {
    const root = draw('student', { layoutMode: 'reflow' });
    expect(
      [...root.querySelectorAll('[data-place-menu] a')].map(
        (a) => a.textContent,
      ),
    ).toEqual(NAMES);
    expect(root.querySelectorAll('[data-beam]')).toHaveLength(0);
  });

  it('in a live lesson, opens a place inside the lesson instead of a tab', () => {
    const openPlace = vi.fn();
    const root = render(
      <SlideRenderer
        slide={projectSlide()}
        surface="student"
        language="en"
        interactions={[]}
        slots={{ openPlace }}
      />,
    ).container;
    expect(root.querySelectorAll('[data-place-menu] a')).toHaveLength(0);
    const icons = root.querySelectorAll('[data-place-menu] button');
    expect(icons).toHaveLength(6);
    fireEvent.click(icons[5]!);
    expect(openPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'arcade' }),
    );
  });

  it('leaves a row holding anything else as ordinary cards', () => {
    const slide = projectSlide();
    const mixed = {
      ...slide,
      // Four places and a game.
      launchTiles: [
        ...(slide.kind === 'content' ? (slide.launchTiles ?? []) : []).slice(
          0,
          4,
        ),
        { id: 'x', module: 'arcade', activityRef: 'arcade:chroma' },
      ],
    } as Slide;
    const root = render(
      <SlideRenderer
        slide={mixed}
        surface="student"
        language="en"
        interactions={[]}
      />,
    ).container;
    expect(root.querySelectorAll('[data-place-menu]')).toHaveLength(0);
  });
});
