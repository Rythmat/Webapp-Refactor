import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import {
  findForbiddenSubstring,
  publishDay,
  type DaySnapshot,
} from '../publish/publishDay';
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
import type { SlideKind, Slide } from './types';

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

describe('Rule 1 firewall — scans keys (field-name leaks), not content values', () => {
  it("an interaction slide with reveal:'words' publishes without tripping FORBIDDEN_SUBSTRINGS", () => {
    const day = newBlankDay('Reveal Day');
    day.deck = emptyDeck(day);
    const slide = newSlide('interaction', 'connectRegulate');
    day.deck.slides = [{ ...slide, reveal: 'words' } as typeof slide];
    expect(findForbiddenSubstring(publishDay(day))).toBeNull();
  });

  it('legitimate content values ("IMPACT Roles" label, a "Cloud"/"Close" title) do NOT trip the firewall', () => {
    // The scan is keys-only, so these visible-copy values are student-safe:
    // 'impact' (label) and 'clo' (title) are content, not leaked field names.
    const day = newBlankDay('Day 2 — IMPACT Roles');
    day.deck = emptyDeck(day);
    const slide = newSlide('content', 'connectRegulate');
    day.deck.slides = [
      { ...slide, title: { en: 'Cloud Nine — Close To You' } } as typeof slide,
    ];
    expect(findForbiddenSubstring(publishDay(day))).toBeNull();
  });

  it('still catches a leaked teacher-only field KEY (belt-and-suspenders)', () => {
    // Simulate a future transform bug letting a rationale field ride through.
    // The matcher names the offending KEY exactly (`impactTags`), not a
    // fragment of it — see FORBIDDEN_KEYS in publishDay.ts.
    const dirty = {
      dayId: 'd',
      label: 'Clean label',
      cells: {},
      deck: {
        id: 'x',
        title: { en: 'Clean' },
        slides: [{ id: 's', title: { en: 'Clean' }, impactTags: ['leak'] }],
      },
    } as unknown as DaySnapshot;
    expect(findForbiddenSubstring(dirty)).toBe('impactTags');
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
    const withIx = setSlideInteractions(day, slideId, [
      textInteraction('ix-a'),
    ]);
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
    const withIx = setSlideInteractions(day, slideId, [
      textInteraction('ix-a'),
    ]);
    const dup = duplicateSlideAt(withIx, 0);

    expect(dup.deck!.slides).toHaveLength(2);
    const originalIds = slideInteractionIds(dup.deck!.slides[0]);
    const cloneIds = slideInteractionIds(dup.deck!.slides[1]);
    expect(originalIds).toEqual(['ix-a']);
    // Clone points at a DIFFERENT interaction id…
    expect(cloneIds).toHaveLength(1);
    expect(cloneIds[0]).not.toBe('ix-a');
    // …and the cell now holds both interactions; nothing dangles.
    expect(dup.cells.connectRegulate.presentation.interactions).toHaveLength(2);
    expect(findDanglingInteractionIds(publishDay(dup))).toEqual([]);
  });

  it('re-keys element ids and the interaction refs INSIDE elements', () => {
    // Latent until P2 task 5 starts emitting `elements` eagerly: today every
    // slide's elements are derived by `migrateSlideV1`, which reads the legacy
    // `interactionIds`, so a derived element can never be stale.
    //
    // Once elements are AUTHORED, `structuredClone` copies them verbatim and
    // `remapSlideInteractions` does not reach inside: it rewrites
    // `interactionIds` only (deckEdit.ts setSlideInteractionIds). The copy's
    // footer element would still name the ORIGINAL interaction — and since
    // `interactionsForSlide` resolves from the NEW id, the lookup misses and
    // the interaction silently disappears from the duplicated slide.
    //
    // Element ids must be re-keyed too: they embed the source slide id
    // (`eid(slide.id, ...)`), so a verbatim copy leaves two slides claiming the
    // same element ids — which `drawTargetElementId` resolves by id.
    const { day, slideId } = dayWithInteractionSlide();
    const withIx = setSlideInteractions(day, slideId, [
      textInteraction('ix-a'),
    ]);
    const authored: Day = {
      ...withIx,
      deck: {
        ...withIx.deck!,
        slides: withIx.deck!.slides.map((s) =>
          s.id === slideId
            ? {
                ...s,
                elements: [
                  {
                    id: `${slideId}:title`,
                    zone: 'title',
                    order: 0,
                    kind: 'text',
                    role: 'title',
                    text: { en: 'Q' },
                  },
                  {
                    id: `${slideId}:interaction:0`,
                    zone: 'footer',
                    order: 0,
                    kind: 'interaction',
                    interactionId: 'ix-a',
                  },
                ],
              }
            : s,
        ),
      },
    };

    const dup = duplicateSlideAt(authored, 0);
    const clone = dup.deck!.slides[1];
    const cloneIx = slideInteractionIds(clone)[0];
    const elementIx = clone.elements?.find((e) => e.kind === 'interaction');

    // The element must point at the clone's OWN interaction, not the original's.
    expect(elementIx?.kind === 'interaction' && elementIx.interactionId).toBe(
      cloneIx,
    );
    // And no element id may be shared with the slide it was copied from.
    const originalElementIds = new Set(
      (dup.deck!.slides[0].elements ?? []).map((e) => e.id),
    );
    for (const e of clone.elements ?? []) {
      expect(originalElementIds.has(e.id)).toBe(false);
    }
  });
});

describe('updateSlideAt — changing kind', () => {
  const styled = (): Slide =>
    ({
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: { en: 'T' },
      prompt: { en: 'P' },
      accent: '#ff0000',
      textStyle: { title: { bold: true, align: 'center' } },
      hidePhaseLabel: true,
      timerSec: 120,
      presetId: 'objectives',
      accentBar: true,
    }) as unknown as Slide;

  it('keeps the slide-level presentation fields that every kind supports', () => {
    // These live on SlideCommon, so they are meaningful for the NEW kind too.
    // Dropping them silently reset a teacher's accent, formatting, timer and
    // preset with nothing in the UI saying so.
    const [next] = updateSlideAt([styled()], 0, { kind: 'interaction' });
    expect(next.kind).toBe('interaction');
    expect(next.accent).toBe('#ff0000');
    expect(next.textStyle).toEqual({ title: { bold: true, align: 'center' } });
    expect(next.hidePhaseLabel).toBe(true);
    expect(next.timerSec).toBe(120);
    expect(next.presetId).toBe('objectives');
    expect(next.accentBar).toBe(true);
  });

  it('still rebuilds the kind-specific fields', () => {
    const [next] = updateSlideAt([styled()], 0, { kind: 'interaction' });
    expect(next.kind === 'interaction' && next.interactionIds).toEqual([]);
    // `body` belongs to ContentSlide alone and must NOT ride along.
    expect(next).not.toHaveProperty('body');
  });

  it('does not carry derived elements across a kind change', () => {
    // Elements are derived from the slide's own fields; a list derived for the
    // OLD kind can name an interaction the new kind no longer has.
    const withElements = {
      ...styled(),
      elements: [
        {
          id: 's1:interaction:0',
          zone: 'footer',
          kind: 'interaction',
          interactionId: 'gone',
        },
      ],
    } as unknown as Slide;
    const [next] = updateSlideAt([withElements], 0, { kind: 'media' });
    expect(next.elements).toBeUndefined();
  });
});
