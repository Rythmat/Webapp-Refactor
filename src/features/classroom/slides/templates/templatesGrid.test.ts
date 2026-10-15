/**
 * Every deck the product actually SHIPS must be a legal grid layout.
 *
 * This is the test that would have caught the footer defect: a slide that
 * stacks two interactions (the Cortex lesson's check-in with its mood poll,
 * as the old exit poll did) needs a footer that takes two. Synthetic element
 * fixtures never exercise that, because nobody hand-writes a
 * two-interaction slide.
 */
import { describe, expect, it } from 'vitest';
import { newBlankDay } from '../../plan/newBlankDay';
import { fixture, fixtureCatalog } from '../cortex/__tests__/fixture';
import {
  applyCortexLessonToDay,
  buildCortexLessonSkeleton,
} from '../cortex/buildDeck';
import { planCortexLesson } from '../cortex/planLesson';
import { searchFocus } from '../cortex/suggestFocus';
import { DEFAULT_CORTEX_CHOICES, GROUP_ROLES } from '../cortex/types';
import { deckFromCells } from '../deckFromCells';
import { migrateSlideV1 } from '../migrateDeckV1';
import { SLIDE_GRID, validateLayout, type ZoneName } from '../slideGrid';
import type { Slide } from '../types';

const graph = fixture();
const catalog = fixtureCatalog();

/** The lesson for a focus in a role, on a fresh Day. */
const lesson = (name: string, role: (typeof GROUP_ROLES)[number]) => {
  const focus = searchFocus(graph, catalog, name)[0];
  return applyCortexLessonToDay(
    newBlankDay(name),
    planCortexLesson(graph, catalog, focus),
    { ...DEFAULT_CORTEX_CHOICES, role },
  );
};

const checkDeck = (label: string, slides: Slide[]) => {
  expect(slides.length, `${label} produced no slides`).toBeGreaterThan(0);
  for (const slide of slides) {
    const elements = migrateSlideV1(slide);
    const issues = validateLayout(elements);
    expect(
      issues,
      `${label} · slide "${slide.id}" (${slide.kind}): ${issues
        .map((i) => i.message)
        .join(' | ')}`,
    ).toEqual([]);
  }
};

describe('shipping decks migrate to a LEGAL grid layout', () => {
  for (const role of GROUP_ROLES) {
    it(`a Cortex lesson about an artist, ${role}`, () => {
      checkDeck(`artist/${role}`, lesson('Ana Lux', role).deck?.slides ?? []);
    });
  }

  it('a Cortex lesson about a place', () => {
    checkDeck(
      'place/producer',
      lesson('Motor City', 'producer').deck?.slides ?? [],
    );
  });

  it('the default deck of a new Day', () => {
    checkDeck('skeleton', buildCortexLessonSkeleton('day-1').slides);
  });

  it('deckFromCells over a blank Day', () => {
    checkDeck('deckFromCells', deckFromCells(newBlankDay('Blank')).slides);
  });
});

describe('the two-interaction slide specifically', () => {
  it('stacks the check-in and the mood poll in the footer and validates', () => {
    const slides = lesson('Ana Lux', 'promoter').deck?.slides ?? [];
    const stacked = slides.find(
      (s) => s.kind === 'interaction' && s.interactionIds.length > 1,
    );
    expect(
      stacked,
      'no multi-interaction slide found — fixture drifted',
    ).toBeDefined();

    const elements = migrateSlideV1(stacked as Slide);
    const footerEls = elements.filter((e) => e.zone === 'footer');
    expect(footerEls).toHaveLength(2);
    expect(validateLayout(elements)).toEqual([]);
  });
});

describe('no shipped slide places content in the footer band', () => {
  it('every migrated element sits above y=620 unless it is an interaction', () => {
    for (const role of GROUP_ROLES)
      for (const slide of lesson('Ana Lux', role).deck?.slides ?? []) {
        for (const el of migrateSlideV1(slide)) {
          if (el.kind === 'interaction') continue;
          const r = SLIDE_GRID[el.zone as ZoneName].rect;
          expect(
            r.y + r.h,
            `${slide.id} · ${el.id} in ${el.zone}`,
          ).toBeLessThanOrEqual(620);
        }
      }
  });
});
