// @vitest-environment jsdom
/**
 * The Individual Project's menu (owner, 2026-11-11): five places, each a
 * card with a clip of the place, drawn as one row so a card can open wide.
 * One clip plays at a time: a spotlight's, or the one under a hand.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlideRenderer } from '../SlideRenderer';
import { buildCortexLessonSkeleton } from '../cortex/buildDeck';
import { SPOTLIGHT_MS } from '../parts/PlaceMenu';
import type { Slide } from '../types';

beforeEach(() => {
  // jsdom plays nothing.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

/** The indexes of the cards whose clip is playing. */
const playing = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-place-menu] video')].flatMap((v, i) =>
    v.hasAttribute('data-playing') ? [i] : [],
  );

describe('the Individual Project menu', () => {
  it('offers the five places as one row of links, each with its clip', () => {
    const root = draw('student');
    const menus = root.querySelectorAll('[data-place-menu]');
    expect(menus).toHaveLength(1);
    const links = [...menus[0].querySelectorAll('a')];
    expect(links.map((a) => a.textContent)).toEqual([
      'Learn',
      'Songs',
      'Library',
      'Studio',
      'Globe',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/learn',
      '/songs',
      '/library',
      '/studio',
      '/globe',
    ]);
    expect(
      [...root.querySelectorAll('video')].map((v) => v.getAttribute('src')),
    ).toEqual([
      '/videos/places/learn.mp4',
      '/videos/places/songs.mp4',
      '/videos/places/library.mp4',
      '/videos/places/studio.mp4',
      '/videos/places/globe.mp4',
    ]);
    // Not five pills as well.
    expect(root.querySelectorAll('[data-element-id]').length).toBeLessThan(5);
  });

  it('plays one clip at a time, the spotlight moving on', () => {
    vi.useFakeTimers();
    const root = draw('student');
    expect(playing(root)).toEqual([0]);
    act(() => vi.advanceTimersByTime(SPOTLIGHT_MS));
    expect(playing(root)).toEqual([1]);
    act(() => vi.advanceTimersByTime(SPOTLIGHT_MS * 4));
    expect(playing(root)).toEqual([0]);
  });

  it('plays the card under a hand, and holds the spotlight there', () => {
    vi.useFakeTimers();
    const root = draw('student');
    const studio = root.querySelectorAll('[data-place-menu] a')[3];
    fireEvent.pointerEnter(studio);
    expect(playing(root)).toEqual([3]);
    act(() => vi.advanceTimersByTime(SPOTLIGHT_MS * 3));
    expect(playing(root)).toEqual([3]);
    // Let go: the spotlight carries on from there.
    fireEvent.pointerLeave(studio);
    act(() => vi.advanceTimersByTime(SPOTLIGHT_MS));
    expect(playing(root)).toEqual([4]);
  });

  it('plays one at a time on the room’s screen, and links nowhere', () => {
    const root = draw('projector');
    expect(root.querySelectorAll('[data-place-menu] a')).toHaveLength(0);
    expect(root.querySelectorAll('video')).toHaveLength(5);
    expect(playing(root)).toEqual([0]);
  });

  it('shows stills in a thumbnail', () => {
    const root = draw('student', { still: true });
    expect(root.querySelectorAll('video')).toHaveLength(0);
    expect(root.querySelectorAll('[data-place-menu] img')).toHaveLength(5);
  });

  it('stacks the five on a phone', () => {
    const root = draw('student', { layoutMode: 'reflow' });
    expect(root.querySelectorAll('[data-place-menu] a')).toHaveLength(5);
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
    const cards = root.querySelectorAll('[data-place-menu] button');
    expect(cards).toHaveLength(5);
    fireEvent.click(cards[3]);
    expect(openPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'studio' }),
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
