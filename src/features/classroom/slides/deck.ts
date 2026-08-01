/**
 * Pure deck helpers — lookup, clamping, phase derivation, and interaction
 * resolution over a published `DaySnapshot`. No React, unit-tested.
 */
import type { PhaseKey } from '../phases';
import type { DaySnapshot } from '../publish/publishDay';
import type { Interaction } from '../types';
import type { Slide, SlideDeck } from './types';

/** The deck attached to a snapshot, or null for legacy slide-less Days. */
export const deckFromSnapshot = (
  snapshot: DaySnapshot | null | undefined,
): SlideDeck | null => snapshot?.deck ?? null;

/** Clamp an incoming slide index to the deck's bounds. -1 stays -1 (legacy nav). */
export const clampSlideIndex = (deck: SlideDeck, index: number): number => {
  if (index < 0 || deck.slides.length === 0) return -1;
  return Math.min(index, deck.slides.length - 1);
};

export const slideAt = (
  deck: SlideDeck | null,
  index: number,
): Slide | null => {
  if (!deck || index < 0 || index >= deck.slides.length) return null;
  return deck.slides[index];
};

/** The phase the session is in at a given slide index (fallback for -1/legacy). */
export const phaseForSlideIndex = (
  deck: SlideDeck | null,
  index: number,
  fallback: PhaseKey,
): PhaseKey => slideAt(deck, index)?.phase ?? fallback;

/** Every interaction id a slide references, regardless of kind. */
export const slideInteractionIds = (slide: Slide): string[] => {
  switch (slide.kind) {
    case 'interaction':
      return slide.interactionIds;
    case 'app-route':
    case 'showcase':
      return [slide.interactionId];
    case 'content':
    case 'media':
    case 'studio-collab':
      return [];
  }
};

/** Find an Interaction by id anywhere in the snapshot's cells. */
export const findInteraction = (
  snapshot: DaySnapshot,
  interactionId: string,
): Interaction | undefined => {
  for (const cell of Object.values(snapshot.cells)) {
    const hit = cell.presentation.interactions?.find(
      (i) => i.id === interactionId,
    );
    if (hit) return hit;
  }
  return undefined;
};

/** Resolve a slide's referenced Interactions (missing ids are dropped). */
export const interactionsForSlide = (
  snapshot: DaySnapshot,
  slide: Slide,
): Interaction[] =>
  slideInteractionIds(slide)
    .map((id) => findInteraction(snapshot, id))
    .filter((i): i is Interaction => i !== undefined);

/**
 * Validate that every interaction id referenced by the deck resolves in the
 * snapshot. Returns the list of dangling ids (empty = valid). Templates and
 * tests use this; the wizard refuses to publish a deck that fails it.
 */
export const findDanglingInteractionIds = (snapshot: DaySnapshot): string[] => {
  const deck = deckFromSnapshot(snapshot);
  if (!deck) return [];
  const dangling: string[] = [];
  for (const slide of deck.slides) {
    for (const id of slideInteractionIds(slide)) {
      if (!findInteraction(snapshot, id)) dangling.push(id);
    }
  }
  return dangling;
};
