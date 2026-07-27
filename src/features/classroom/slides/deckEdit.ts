/**
 * Pure deck-editing primitives for the DayEditor freeform slide editor
 * (Phase 4). Every produced Slide stays strictly within the projectSlide
 * whitelist (publish/publishDay.ts) so nothing silently drops at publish.
 */
import type { PhaseKey } from '../phases';
import type { Day, LocalizedText } from '../types';
import type { Slide, SlideDeck, SlideKind } from './types';

const slideUid = (): string =>
  `slide-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`;

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
      return {
        ...common,
        kind: 'media',
        media: { type: 'youtube', videoId: '' },
      };
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
