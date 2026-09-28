/**
 * The deck every new Day starts from.
 *
 * The rule that matters: it must not author copy the preset then hides. A seed
 * naming a preset that turns its own field off writes text no one will ever
 * read, and nothing else in the system complains — `hidden` is a legitimate
 * state, so there is no error to see.
 */
import { describe, expect, it } from 'vitest';
import { PHASES } from '../../phases';
import { migrateSlideV1 } from '../migrateDeckV1';
import { validateLayout } from '../slideGrid';
import {
  buildGeneralLessonDeck,
  generalLessonTeacherNotes,
} from './generalLesson';
import { presetFor } from './presets';

const deck = buildGeneralLessonDeck('d1');

describe('the default new-Day deck', () => {
  it('ships the nine student-facing slides of the source arc', () => {
    expect(deck.slides).toHaveLength(9);
  });

  it('keeps phases non-decreasing, as SlideDeck requires', () => {
    let last = -1;
    for (const s of deck.slides) {
      const i = PHASES.indexOf(s.phase);
      expect(i, `${s.id}`).toBeGreaterThanOrEqual(last);
      last = i;
    }
  });

  it('names only presets legal for the slide kind it emits', () => {
    for (const s of deck.slides) {
      const preset = presetFor(s.presetId);
      expect(preset, `${s.id} has an unknown preset`).toBeDefined();
      expect(
        preset!.kinds.includes(s.kind),
        `${s.presetId} does not claim ${s.kind}`,
      ).toBe(true);
    }
  });

  it('never authors a field its own preset hides', () => {
    for (const s of deck.slides) {
      const hidden = migrateSlideV1(s).filter((e) => e.hidden);
      // `last-5` hides the REQUIRED title on purpose: a centre stack excludes
      // the title zone and `SlideCommon.title` cannot be omitted.
      const unexpected = hidden.filter((e) => !e.id.endsWith(':title'));
      expect(
        unexpected.map((e) => e.id),
        `${s.presetId} authors content it hides`,
      ).toEqual([]);
    }
  });

  it('produces a legal layout for every slide', () => {
    for (const s of deck.slides) {
      expect(validateLayout(migrateSlideV1(s)), `${s.id}`).toEqual([]);
    }
  });

  it('keeps the teacher prep checklist OFF the slides', () => {
    const notes = generalLessonTeacherNotes();
    expect(notes).toContain('For the Teachers');
    const slideText = JSON.stringify(deck.slides);
    for (const phrase of [
      'For the Teachers',
      'Does your sound work',
      'tripping over',
    ]) {
      expect(slideText).not.toContain(phrase);
    }
  });
});
