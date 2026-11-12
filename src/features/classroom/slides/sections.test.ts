import { describe, expect, it } from 'vitest';
import { bareDay } from '../plan/bareDay.testUtils';
import type { Day } from '../types';
import { moveSlideToSection } from './deckEdit';
import {
  SECTIONS,
  SECTION_PHASE,
  groupSlidesBySection,
  sectionInsertIndex,
  sectionOf,
  slidesAreSectionOrdered,
  sortSlidesBySection,
} from './sections';
import type { Slide } from './types';

const slide = (over: Partial<Slide> & Pick<Slide, 'id' | 'phase'>): Slide =>
  ({ kind: 'content', title: { en: over.id }, ...over }) as Slide;

describe('sections', () => {
  it('are the six, in the owner’s order', () => {
    expect([...SECTIONS]).toEqual([
      'connect',
      'showcase',
      'groupProject',
      'individualProject',
      'present',
      'reflect',
    ]);
  });

  it('place a slide by its own section, when it agrees with the phase', () => {
    expect(
      sectionOf(
        slide({ id: 'a', phase: 'connectRegulate', section: 'showcase' }),
      ),
    ).toBe('showcase');
    // A section that disagrees with the phase is ignored, not trusted.
    expect(
      sectionOf(slide({ id: 'b', phase: 'groupPractice', section: 'reflect' })),
    ).toBe('groupProject');
  });

  it('place a slide saved before sections from its phase', () => {
    expect(sectionOf(slide({ id: 'c', phase: 'connectRegulate' }))).toBe(
      'connect',
    );
    expect(sectionOf(slide({ id: 'd', phase: 'creativeProjects' }))).toBe(
      'individualProject',
    );
    expect(sectionOf(slide({ id: 'e', phase: 'respondReflectReset' }))).toBe(
      'reflect',
    );
  });

  it('find the old Showcase slides in the first phase', () => {
    const at = (over: Partial<Slide>) =>
      sectionOf(slide({ id: 'x', phase: 'connectRegulate', ...over }));
    expect(at({ presetId: 'artist-spotlight' })).toBe('showcase');
    expect(at({ id: 'day-cx-slide-showcase' })).toBe('showcase');
    expect(
      at({
        kind: 'media',
        media: { type: 'youtube', videoId: 'v' },
      } as Partial<Slide>),
    ).toBe('showcase');
    expect(at({ presetId: 'greeting-check-in' })).toBe('connect');
  });

  it('check, sort and group by section', () => {
    const slides = [
      slide({ id: 'g', phase: 'groupPractice' }),
      slide({ id: 'c', phase: 'connectRegulate' }),
      slide({ id: 's', phase: 'connectRegulate', section: 'showcase' }),
      slide({ id: 'r', phase: 'respondReflectReset' }),
    ];
    expect(slidesAreSectionOrdered(slides)).toBe(false);
    const sorted = sortSlidesBySection(slides);
    expect(sorted.map((s) => s.id)).toEqual(['c', 's', 'g', 'r']);
    expect(slidesAreSectionOrdered(sorted)).toBe(true);

    const groups = groupSlidesBySection(sorted);
    expect(groups.map((g) => g.section)).toEqual([...SECTIONS]);
    expect(groups.map((g) => g.slides.map((s) => s.slide.id))).toEqual([
      ['c'],
      ['s'],
      ['g'],
      [],
      [],
      ['r'],
    ]);
    expect(groups[5].slides[0].index).toBe(3);
  });

  it('insert a new slide at the end of its section', () => {
    const slides = [
      slide({ id: 'c', phase: 'connectRegulate' }),
      slide({ id: 'g', phase: 'groupPractice' }),
      slide({ id: 'r', phase: 'respondReflectReset' }),
    ];
    expect(sectionInsertIndex(slides, 'connect')).toBe(1);
    // Showcase is empty: before Group Project.
    expect(sectionInsertIndex(slides, 'showcase')).toBe(1);
    expect(sectionInsertIndex(slides, 'individualProject')).toBe(2);
    expect(sectionInsertIndex(slides, 'reflect')).toBe(3);
    expect(sectionInsertIndex([], 'present')).toBe(0);
  });
});

describe('moveSlideToSection', () => {
  const dayWithQuestion = (): Day => {
    const day = bareDay('Move');
    day.deck = {
      id: 'deck',
      title: { en: 'Move' },
      slides: [
        slide({ id: 'c', phase: 'connectRegulate', section: 'connect' }),
        {
          id: 'q',
          kind: 'interaction',
          phase: 'connectRegulate',
          section: 'connect',
          title: { en: 'Q' },
          interactionIds: ['ix-q'],
        },
        slide({ id: 'g', phase: 'groupPractice', section: 'groupProject' }),
      ],
    };
    day.cells.connectRegulate.presentation.interactions = [
      { id: 'ix-q', type: 'text', question: { en: 'Q' }, shareable: true },
      { id: 'ix-keep', type: 'text', question: { en: 'K' }, shareable: true },
    ];
    return day;
  };

  it('carries the slide’s questions to the new section’s phase', () => {
    const { day, index } = moveSlideToSection(
      dayWithQuestion(),
      'q',
      'reflect',
    );
    const moved = day.deck!.slides[index];
    expect(moved).toMatchObject({
      id: 'q',
      section: 'reflect',
      phase: SECTION_PHASE.reflect,
    });
    expect(index).toBe(2);
    expect(
      day.cells.respondReflectReset.presentation.interactions?.map((i) => i.id),
    ).toEqual(['ix-q']);
    // Another slide's question stays where it was.
    expect(
      day.cells.connectRegulate.presentation.interactions?.map((i) => i.id),
    ).toEqual(['ix-keep']);
    expect(slidesAreSectionOrdered(day.deck!.slides)).toBe(true);
  });

  it('moves within a phase without touching the cells', () => {
    const before = dayWithQuestion();
    const { day } = moveSlideToSection(before, 'c', 'showcase');
    expect(day.cells).toBe(before.cells);
    expect(day.deck!.slides.map((s) => s.id)).toEqual(['q', 'c', 'g']);
  });

  it('is a no-op for an unknown slide', () => {
    const before = dayWithQuestion();
    expect(moveSlideToSection(before, 'nope', 'reflect')).toEqual({
      day: before,
      index: -1,
    });
  });
});
