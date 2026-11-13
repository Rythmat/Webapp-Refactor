// @vitest-environment jsdom
/**
 * The Individual Project's menu (owner, 2026-11-12): the six places as
 * cards, three each side, each joined by a line to the Music Atlas logo with
 * a streak running into it, and showing where the person left off there
 * (2026-11-13: one card per place).
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlideRenderer } from '../SlideRenderer';
import { buildCortexLessonSkeleton } from '../cortex/buildDeck';
import { CARD_H, CARD_W, layoutPlaces } from '../parts/PlaceMenu';
import { usePlaceSummaries } from '../placeSummaries';
import { PROJECT_PLACES } from '../projectPlaces';
import { resolveActivityRefHref } from '../resolveContentHref';
import type { Slide } from '../types';

// The person's own data, as their screen would read it.
vi.mock('../placeSummaries', async (actual) => ({
  ...(await actual<typeof import('../placeSummaries')>()),
  usePlaceSummaries: vi.fn(() => ({
    learn: {
      title: 'Pop — Level 1',
      detail: '3/8 activities',
      href: '/learn/pop/1',
    },
    songs: { title: '1999', detail: 'Prince', href: '/songs/1999' },
    library: null,
    studio: null,
    globe: {
      title: 'Soul Makossa',
      detail: 'Last visited',
      href: '/globe?event=e1',
    },
    arcade: null,
  })),
}));

afterEach(() => {
  cleanup();
  vi.mocked(usePlaceSummaries).mockClear();
});

const projectSlide = (): Slide => {
  const slide = buildCortexLessonSkeleton('day-1').slides.find(
    (s) => s.section === 'individualProject',
  );
  if (!slide) throw new Error('no Individual Project slide');
  return slide;
};

const draw = (
  surface: 'student' | 'projector' | 'present',
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
    const nodes = layoutPlaces(PROJECT_PLACES, 1152, 396);
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
    // Level across, the cards reaching from the box's top to its foot.
    expect(left.map((n) => n.y)).toEqual(right.map((n) => n.y));
    expect(left.map((n) => n.y)).toEqual([CARD_H / 2, 198, 396 - CARD_H / 2]);
    // The columns stand at the two edges.
    for (const n of left) expect(n.x).toBe(CARD_W / 2);
    for (const n of right) expect(n.x).toBe(1152 - CARD_W / 2);
    // Each line leaves its card's inner edge and ends at the logo's edge,
    // level with its middle.
    for (const n of left) expect(n.path).toMatch(new RegExp(`^M ${CARD_W} `));
    for (const n of right)
      expect(n.path).toMatch(new RegExp(`^M ${1152 - CARD_W} `));
    for (const n of nodes) expect(n.path).toMatch(/ 198$/);
  });

  it('lays an older five-place lesson out three and two', () => {
    const nodes = layoutPlaces(PROJECT_PLACES.slice(0, 5), 1152, 396);
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
  it('offers the six places as cards around the logo, with lines', () => {
    const root = draw('student');
    const menus = root.querySelectorAll('[data-place-menu]');
    expect(menus).toHaveLength(1);
    // One card per place, and nothing else to click.
    const links = [
      ...menus[0]!.querySelectorAll<HTMLAnchorElement>(
        '[data-place-beams] > a',
      ),
    ];
    expect(links).toHaveLength(6);
    expect(menus[0]!.querySelectorAll('a')).toHaveLength(6);
    expect(
      links.map(
        (a) => a.querySelector('[data-place-card] > span')!.textContent,
      ),
    ).toEqual(NAMES);
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
    const studio = root.querySelectorAll('[data-place-beams] > a')[3]!;
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
    // The line under the hand shows no streak of its own (its rainbow
    // flows instead), and rests at the end of its loop too.
    expect(streaks('studio').map((p) => p.getAttribute('opacity'))).toEqual([
      '0',
      '0',
    ]);
    fireEvent.animationIteration(streaks('studio')[1]!);
    expect(state('studio')).toEqual(['paused', 'paused']);
    fireEvent.pointerLeave(studio);
    expect(line('studio')).toBe(before);
    expect(state('learn')).toEqual(['running', 'running']);
    expect(state('studio')).toEqual(['running', 'running']);
  });

  it('is a picture on the room’s screen, nothing to click', () => {
    const root = draw('projector');
    expect(root.querySelectorAll('[data-place-menu] a')).toHaveLength(0);
    expect(root.querySelectorAll('[data-place-menu] button')).toHaveLength(0);
    expect(root.querySelectorAll('[data-place]')).toHaveLength(6);
    // The cards name the places and say what each is, and no one's work:
    // nothing of anyone's read.
    expect(
      [...root.querySelectorAll('[data-place-card]')].map((b) => b.textContent),
    ).toEqual(PROJECT_PLACES.map((p) => `${p.label.en}${p.blurb.en}`));
    expect(usePlaceSummaries).not.toHaveBeenCalled();
  });

  it('runs no streaks in a thumbnail', () => {
    const root = draw('projector', { still: true });
    expect(root.querySelectorAll('[data-beam]')).toHaveLength(6);
    expect(root.querySelectorAll('.place-beam')).toHaveLength(0);
    expect(usePlaceSummaries).not.toHaveBeenCalled();
  });

  it('lists the six on a phone, without lines', () => {
    const root = draw('student', { layoutMode: 'reflow' });
    const rows = [...root.querySelectorAll('[data-place-menu] a')];
    expect(rows.map((a) => a.textContent)).toEqual([
      'LearnPop — Level 1',
      'Songs1999',
      'Library',
      'Studio',
      'GlobeSoul Makossa',
      'Arcade',
    ]);
    // A row with their work opens it.
    expect(rows[0]!.getAttribute('href')).toBe('/learn/pop/1');
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
    const cards = root.querySelectorAll('[data-place-beams] > button');
    expect(cards).toHaveLength(6);
    fireEvent.click(cards[5]!);
    expect(openPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'arcade' }),
    );
  });

  it('shows where the person left off on each card, each opening it', () => {
    const root = draw('present');
    const boxes = [
      ...root.querySelectorAll<HTMLAnchorElement>('[data-place-beams] > a'),
    ];
    expect(boxes.map((b) => b.textContent)).toEqual([
      'LearnPop — Level 13/8 activities',
      'Songs1999Prince',
      'LibraryStart a project',
      'StudioStart a session',
      'GlobeSoul MakossaLast visited',
      'ArcadePlay a game',
    ]);
    expect(boxes[0]!.getAttribute('href')).toBe('/learn/pop/1');
    expect(boxes[0]!.target).toBe('_blank');
    // A place with nothing of theirs opens at its front page.
    expect(boxes[5]!.getAttribute('href')).toBe('/arcade');
  });

  it('lights a place’s line from its card', () => {
    const root = draw('present');
    const box = root.querySelectorAll('[data-place-beams] > a')[1]!;
    fireEvent.pointerEnter(box);
    expect(
      root.querySelector('[data-beam="songs"] path')!.getAttribute('stroke'),
    ).toMatch(/-songs-flow\)$/);
  });

  it('in a live lesson, a card opens the very thing inside the lesson', () => {
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
    const boxes = root.querySelectorAll('[data-place-beams] > button');
    fireEvent.click(boxes[4]!);
    expect(openPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'globe' }),
      '/globe?event=e1',
    );
    // Nothing of theirs there: the place itself.
    fireEvent.click(boxes[5]!);
    expect(openPlace).toHaveBeenLastCalledWith(
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
