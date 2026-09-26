/**
 * Every deck the product actually SHIPS must be a legal grid layout.
 *
 * This is the test that would have caught the footer defect: the exit-poll
 * slide stacks two interactions, and a `single`-flow footer rejected every deck
 * both templates produce. Synthetic element fixtures never exercise that,
 * because nobody hand-writes a two-interaction slide.
 */
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { newBlankDay } from '../../plan/newBlankDay';
import { deckFromCells } from '../deckFromCells';
import { migrateSlideV1 } from '../migrateDeckV1';
import { SLIDE_GRID, validateLayout, type ZoneName } from '../slideGrid';
import type { Slide } from '../types';
import { buildSongSessionDay } from './songSession';

const makeSong = (overrides: Partial<Song> = {}): Song => ({
  id: 'test_groove',
  title: 'Test Groove',
  artist: 'The Fixture Band',
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  sections: [],
  audioSources: [
    {
      provider: 'youtube',
      uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      startOffsetSec: 3,
    },
  ],
  artistImageSource: 'none',
  ...overrides,
});

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

describe('shipping templates migrate to a LEGAL grid layout', () => {
  it('song session', () => {
    const day = buildSongSessionDay({ song: makeSong() });
    checkDeck('songSession', day.deck?.slides ?? []);
  });

  it('song session — text-question variant', () => {
    const day = buildSongSessionDay({
      song: makeSong(),
      params: {
        question: {
          type: 'text',
          question: { en: 'Describe the groove.' },
        },
      },
    });
    checkDeck('songSession(text)', day.deck?.slides ?? []);
  });

  it('deckFromCells over a blank Day', () => {
    checkDeck('deckFromCells', deckFromCells(newBlankDay('Blank')).slides);
  });
});

describe('the exit-poll slide specifically', () => {
  it('stacks two interactions in the footer and validates', () => {
    const day = buildSongSessionDay({ song: makeSong() });
    const exit = (day.deck?.slides ?? []).find(
      (s) => s.kind === 'interaction' && s.interactionIds.length > 1,
    );
    expect(
      exit,
      'no multi-interaction slide found — fixture drifted',
    ).toBeDefined();

    const elements = migrateSlideV1(exit as Slide);
    const footerEls = elements.filter((e) => e.zone === 'footer');
    expect(footerEls).toHaveLength(2);
    expect(validateLayout(elements)).toEqual([]);
  });
});

describe('no shipped slide places content in the footer band', () => {
  it('every migrated element sits above y=620 unless it is an interaction', () => {
    const day = buildSongSessionDay({ song: makeSong() });
    for (const slide of day.deck?.slides ?? []) {
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
