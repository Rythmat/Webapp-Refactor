import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import { findForbiddenSubstring, publishDay } from '../publish/publishDay';
import type { Day, Interaction } from '../types';
import { findDanglingInteractionIds, slideInteractionIds } from './deck';
import {
  deleteSlideAt,
  duplicateSlideAt,
  emptyDeck,
  insertSlideAt,
  moveSlide,
  newSlide,
  setSlideInteractions,
  slidesArePhaseOrdered,
  updateSlideAt,
} from './deckEdit';
import type { SlideKind } from './types';

const KINDS: SlideKind[] = [
  'content',
  'media',
  'interaction',
  'app-route',
  'studio-collab',
  'showcase',
];

describe('newSlide', () => {
  it('builds a publish-clean slide of every kind', () => {
    const day = newBlankDay('Editor Day');
    day.deck = emptyDeck(day);
    day.deck.slides = KINDS.map((kind) => newSlide(kind, 'connectRegulate'));
    const snapshot = publishDay(day);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
    expect(snapshot.deck?.slides.map((s) => s.kind)).toEqual(KINDS);
  });

  it('anchors to the given phase with a unique id', () => {
    const a = newSlide('content', 'groupPractice');
    const b = newSlide('content', 'groupPractice');
    expect(a.phase).toBe('groupPractice');
    expect(a.id).not.toBe(b.id);
  });
});

describe('word-cloud reveal is publish-safe (Rule 1 firewall)', () => {
  // NB: the day label must itself be free of forbidden substrings — 'Cloud'
  // contains 'clo' — so the reveal token is the only variable under test.
  it("an interaction slide with reveal:'words' publishes without tripping FORBIDDEN_SUBSTRINGS", () => {
    const day = newBlankDay('Reveal Day');
    day.deck = emptyDeck(day);
    const slide = newSlide('interaction', 'connectRegulate');
    day.deck.slides = [{ ...slide, reveal: 'words' } as typeof slide];
    // The published snapshot carries reveal verbatim; 'words' must be clean.
    expect(findForbiddenSubstring(publishDay(day))).toBeNull();
  });

  it("regression guard: the old 'cloud' token WOULD have tripped 'clo'", () => {
    const day = newBlankDay('Reveal Day');
    day.deck = emptyDeck(day);
    const slide = newSlide('interaction', 'connectRegulate');
    // Cast through unknown — 'cloud' is no longer assignable, which is the point.
    day.deck.slides = [
      { ...slide, reveal: 'cloud' as unknown as 'words' } as typeof slide,
    ];
    expect(findForbiddenSubstring(publishDay(day))).toBe('clo');
  });
});

describe('slide list mutations', () => {
  const slides = [
    newSlide('content', 'connectRegulate'),
    newSlide('interaction', 'groupPractice'),
    newSlide('media', 'groupPractice'),
  ];

  it('moveSlide swaps and clamps at the ends', () => {
    expect(moveSlide(slides, 0, 1).map((s) => s.kind)).toEqual([
      'interaction',
      'content',
      'media',
    ]);
    expect(moveSlide(slides, 0, -1)).toBe(slides); // clamped no-op
    expect(moveSlide(slides, 2, 1)).toBe(slides); // clamped no-op
  });

  it('insertSlideAt / deleteSlideAt', () => {
    const inserted = insertSlideAt(
      slides,
      newSlide('showcase', 'presentPerform'),
      1,
    );
    expect(inserted).toHaveLength(4);
    expect(inserted[1].kind).toBe('showcase');
    expect(deleteSlideAt(slides, 1)).toHaveLength(2);
  });

  it('updateSlideAt merges a patch, and rebuilds on a kind change (preserving id/title)', () => {
    const withTitle = updateSlideAt(slides, 0, { title: { en: 'Hi' } });
    expect(withTitle[0].title.en).toBe('Hi');

    const changed = updateSlideAt(withTitle, 0, { kind: 'media' });
    expect(changed[0].kind).toBe('media');
    expect(changed[0].id).toBe(withTitle[0].id);
    expect(changed[0].title.en).toBe('Hi');
    if (changed[0].kind === 'media') {
      expect(changed[0].media.type).toBe('youtube');
    }
  });
});

describe('slidesArePhaseOrdered', () => {
  it('accepts non-decreasing phases and rejects a backwards jump', () => {
    const ok = [
      newSlide('content', 'connectRegulate'),
      newSlide('interaction', 'groupPractice'),
    ];
    expect(slidesArePhaseOrdered(ok, PHASES)).toBe(true);
    const bad = [
      newSlide('content', 'presentPerform'),
      newSlide('interaction', 'connectRegulate'),
    ];
    expect(slidesArePhaseOrdered(bad, PHASES)).toBe(false);
  });
});

/** A Day with one empty interaction slide in the Connect phase. */
const dayWithInteractionSlide = (): { day: Day; slideId: string } => {
  const day = newBlankDay('IX Day');
  day.deck = emptyDeck(day);
  const slide = newSlide('interaction', 'connectRegulate');
  day.deck.slides = [slide];
  return { day, slideId: slide.id };
};

const textInteraction = (id: string): Interaction => ({
  id,
  type: 'text',
  question: { en: 'One word for today' },
  shareable: false,
});

describe('setSlideInteractions (write-path)', () => {
  it('writes the interaction into the cell + slide, with no dangling ref', () => {
    const { day, slideId } = dayWithInteractionSlide();
    const next = setSlideInteractions(day, slideId, [textInteraction('ix-a')]);

    // Slide references the id…
    const slide = next.deck!.slides.find((s) => s.id === slideId)!;
    expect(slideInteractionIds(slide)).toEqual(['ix-a']);
    // …and the cell holds the interaction object.
    expect(
      next.cells.connectRegulate.presentation.interactions?.map((i) => i.id),
    ).toEqual(['ix-a']);
    // The publish gate sees zero dangling references.
    expect(findDanglingInteractionIds(publishDay(next))).toEqual([]);
  });

  it('removing an interaction strips it from both sides', () => {
    const { day, slideId } = dayWithInteractionSlide();
    const withIx = setSlideInteractions(day, slideId, [textInteraction('ix-a')]);
    const cleared = setSlideInteractions(withIx, slideId, []);
    const slide = cleared.deck!.slides.find((s) => s.id === slideId)!;
    expect(slideInteractionIds(slide)).toEqual([]);
    expect(
      cleared.cells.connectRegulate.presentation.interactions,
    ).toBeUndefined();
    expect(findDanglingInteractionIds(publishDay(cleared))).toEqual([]);
  });
});

describe('duplicateSlideAt', () => {
  it('clones a slide with independent interactions (fresh ids, no dangling)', () => {
    const { day, slideId } = dayWithInteractionSlide();
    const withIx = setSlideInteractions(day, slideId, [textInteraction('ix-a')]);
    const dup = duplicateSlideAt(withIx, 0);

    expect(dup.deck!.slides).toHaveLength(2);
    const originalIds = slideInteractionIds(dup.deck!.slides[0]);
    const cloneIds = slideInteractionIds(dup.deck!.slides[1]);
    expect(originalIds).toEqual(['ix-a']);
    // Clone points at a DIFFERENT interaction id…
    expect(cloneIds).toHaveLength(1);
    expect(cloneIds[0]).not.toBe('ix-a');
    // …and the cell now holds both interactions; nothing dangles.
    expect(
      dup.cells.connectRegulate.presentation.interactions,
    ).toHaveLength(2);
    expect(findDanglingInteractionIds(publishDay(dup))).toEqual([]);
  });
});
