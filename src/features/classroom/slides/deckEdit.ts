/**
 * Pure deck-editing primitives for the DayEditor freeform slide editor
 * (Phase 4). Every produced Slide stays strictly within the projectSlide
 * whitelist (publish/publishDay.ts) so nothing silently drops at publish.
 */
import type { PhaseKey } from '../phases';
import type { Cell, Day, Interaction, LocalizedText } from '../types';
import { slideInteractionIds } from './deck';
import type { Slide, SlideDeck, SlideKind } from './types';

const slideUid = (): string =>
  `slide-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`;

const interactionUid = (): string =>
  `ix-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`;

/** Point a slide's interaction reference(s) at a new id list (kind-aware). */
const setSlideInteractionIds = (slide: Slide, ids: string[]): Slide => {
  switch (slide.kind) {
    case 'interaction':
      return { ...slide, interactionIds: ids };
    case 'app-route':
    case 'showcase':
      return { ...slide, interactionId: ids[0] ?? '' };
    case 'content':
    case 'media':
    case 'studio-collab':
      return slide;
  }
};

/** Rewrite a slide's interaction references through an old→new id map. */
const remapSlideInteractions = (
  slide: Slide,
  idMap: Map<string, string>,
): Slide =>
  setSlideInteractionIds(
    slide,
    slideInteractionIds(slide).map((id) => idMap.get(id) ?? id),
  );

/** A blank slide of the given kind, anchored to a phase. Fields match the
 *  templates' canonical shapes + the projectSlide whitelist. */
export const newSlide = (kind: SlideKind, phase: PhaseKey): Slide => {
  const common = {
    id: slideUid(),
    phase,
    title: { en: '' } as LocalizedText,
  };
  switch (kind) {
    case 'content':
      return { ...common, kind: 'content', variant: 'plain' };
    case 'media':
      return { ...common, kind: 'media', media: { type: 'youtube', videoId: '' } };
    case 'interaction':
      return { ...common, kind: 'interaction', interactionIds: [] };
    case 'app-route':
      return { ...common, kind: 'app-route', interactionId: '' };
    case 'studio-collab':
      return { ...common, kind: 'studio-collab', grouping: 'pairs' };
    case 'showcase':
      return { ...common, kind: 'showcase', interactionId: '' };
  }
};

export const emptyDeck = (day: Day): SlideDeck => ({
  id: `${day.id}-deck`,
  title: { en: day.label },
  slides: [],
});

/** Swap the slide at `index` with its neighbor `delta` away (clamped). */
export const moveSlide = (
  slides: Slide[],
  index: number,
  delta: number,
): Slide[] => {
  const target = index + delta;
  if (index < 0 || index >= slides.length) return slides;
  if (target < 0 || target >= slides.length) return slides;
  const next = [...slides];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const insertSlideAt = (
  slides: Slide[],
  slide: Slide,
  atIndex: number,
): Slide[] => {
  const next = [...slides];
  next.splice(Math.max(0, Math.min(atIndex, slides.length)), 0, slide);
  return next;
};

export const deleteSlideAt = (slides: Slide[], index: number): Slide[] =>
  slides.filter((_, i) => i !== index);

/**
 * Merge a partial patch into the slide at `index`. When `kind` changes, the
 * slide is rebuilt from `newSlide` (preserving id/phase/title/prompt) so it
 * carries the new kind's required fields and nothing stale.
 */
export const updateSlideAt = (
  slides: Slide[],
  index: number,
  patch: Partial<Slide>,
): Slide[] => {
  const current = slides[index];
  if (!current) return slides;
  let nextSlide: Slide;
  if (patch.kind && patch.kind !== current.kind) {
    const rebuilt = newSlide(patch.kind, current.phase);
    nextSlide = {
      ...rebuilt,
      id: current.id,
      title: current.title,
      ...(current.prompt !== undefined ? { prompt: current.prompt } : {}),
      ...(patch.phase ? { phase: patch.phase } : {}),
    };
  } else {
    nextSlide = { ...current, ...patch } as Slide;
  }
  const next = [...slides];
  next[index] = nextSlide;
  return next;
};

/** Whether every slide's phase is non-decreasing in PHASES order (soft invariant). */
export const slidesArePhaseOrdered = (
  slides: Slide[],
  phases: readonly PhaseKey[],
): boolean => {
  let last = -1;
  for (const s of slides) {
    const idx = phases.indexOf(s.phase);
    if (idx < last) return false;
    last = idx;
  }
  return true;
};

// ─── Day-level helpers (touch deck slides + the interaction backing store) ───
//
// Interactions live in `cells[phase].presentation.interactions`, referenced by
// a slide's `interactionIds`/`interactionId`. These helpers keep both sides in
// sync so the dangling-ref publish gate (findDanglingInteractionIds) never
// trips, and so a duplicated slide gets its OWN interactions rather than
// sharing ids with the original.

/**
 * Duplicate the slide at `index`, inserting the copy right after it. If the
 * slide references interactions, they are deep-copied into the phase cell with
 * fresh ids and the copy is repointed at them, so editing the copy's questions
 * never mutates the original's.
 */
export const duplicateSlideAt = (day: Day, index: number): Day => {
  const deck = day.deck;
  if (!deck || index < 0 || index >= deck.slides.length) return day;
  const original = deck.slides[index];
  const phase = original.phase;
  const cell = day.cells[phase];

  const oldIds = slideInteractionIds(original);
  const idMap = new Map<string, string>();
  const clonedInteractions: Interaction[] = [];
  const cellInteractions = cell.presentation.interactions ?? [];
  for (const oldId of oldIds) {
    const src = cellInteractions.find((i) => i.id === oldId);
    if (!src) continue;
    const newId = interactionUid();
    idMap.set(oldId, newId);
    clonedInteractions.push({ ...structuredClone(src), id: newId });
  }

  const clone = remapSlideInteractions(
    { ...structuredClone(original), id: slideUid() },
    idMap,
  );

  const nextCell: Cell = clonedInteractions.length
    ? {
        ...cell,
        presentation: {
          ...cell.presentation,
          interactions: [...cellInteractions, ...clonedInteractions],
        },
      }
    : cell;

  return {
    ...day,
    deck: { ...deck, slides: insertSlideAt(deck.slides, clone, index + 1) },
    cells: { ...day.cells, [phase]: nextCell },
  };
};

/**
 * Replace the interactions a single slide owns. Writes the interaction objects
 * into the slide's phase cell AND repoints the slide's id list — one
 * transaction, so no dangling ref is ever produced. Other slides' interactions
 * in the same phase are preserved.
 */
export const setSlideInteractions = (
  day: Day,
  slideId: string,
  interactions: Interaction[],
): Day => {
  const deck = day.deck;
  if (!deck) return day;
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) return day;
  const phase = slide.phase;
  const cell = day.cells[phase];

  const oldIds = slideInteractionIds(slide);
  const newIds = interactions.map((i) => i.id);
  // Keep interactions owned by OTHER slides; drop this slide's previous set and
  // this slide's incoming set from the "others" bucket before re-appending.
  const others = (cell.presentation.interactions ?? []).filter(
    (i) => !oldIds.includes(i.id) && !newIds.includes(i.id),
  );
  const nextInteractions = [...others, ...interactions];

  const nextCell: Cell = {
    ...cell,
    presentation: {
      ...cell.presentation,
      interactions: nextInteractions.length ? nextInteractions : undefined,
    },
  };

  return {
    ...day,
    deck: {
      ...deck,
      slides: deck.slides.map((s) =>
        s.id === slideId ? setSlideInteractionIds(s, newIds) : s,
      ),
    },
    cells: { ...day.cells, [phase]: nextCell },
  };
};

/** Fresh interaction id for editor-authored interactions. */
export const newInteractionId = interactionUid;
