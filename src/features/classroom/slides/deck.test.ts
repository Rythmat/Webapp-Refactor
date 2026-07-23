import { describe, expect, it } from 'vitest';
import type { DaySnapshot } from '../publish/publishDay';
import {
  clampSlideIndex,
  deckFromSnapshot,
  findDanglingInteractionIds,
  findInteraction,
  interactionsForSlide,
  phaseForSlideIndex,
  slideAt,
  slideInteractionIds,
} from './deck';
import type { SlideDeck } from './types';

const deck: SlideDeck = {
  id: 'deck-t',
  title: { en: 'Test deck' },
  slides: [
    {
      id: 'sl-a',
      kind: 'content',
      phase: 'connectRegulate',
      variant: 'welcome',
      title: { en: 'Welcome' },
    },
    {
      id: 'sl-b',
      kind: 'interaction',
      phase: 'groupPractice',
      title: { en: 'Question' },
      interactionIds: ['ix-1', 'ix-2'],
    },
    {
      id: 'sl-c',
      kind: 'showcase',
      phase: 'presentPerform',
      title: { en: 'Showcase' },
      interactionId: 'ix-3',
    },
  ],
};

const emptyCell = () => ({
  presentation: {
    title: { en: 't' },
    prompt: { en: 'p' },
    launchTiles: [],
  },
});

const snapshot: DaySnapshot = {
  dayId: 'day-t',
  label: 'Test',
  cells: {
    connectRegulate: emptyCell(),
    groupPractice: {
      presentation: {
        title: { en: 't' },
        prompt: { en: 'p' },
        launchTiles: [],
        interactions: [
          {
            id: 'ix-1',
            type: 'choice',
            question: { en: 'Q1' },
            shareable: true,
            choice: { options: [{ en: 'A' }, { en: 'B' }], multi: false },
          },
          {
            id: 'ix-2',
            type: 'text',
            question: { en: 'Q2' },
            shareable: true,
            text: { maxLen: 240 },
          },
        ],
      },
    },
    creativeProjects: emptyCell(),
    presentPerform: emptyCell(),
    respondReflectReset: emptyCell(),
  },
  deck,
};

describe('deck helpers', () => {
  it('deckFromSnapshot returns the deck or null', () => {
    expect(deckFromSnapshot(snapshot)).toBe(deck);
    expect(deckFromSnapshot({ ...snapshot, deck: undefined })).toBeNull();
    expect(deckFromSnapshot(null)).toBeNull();
  });

  it('clampSlideIndex keeps -1 and clamps to bounds', () => {
    expect(clampSlideIndex(deck, -1)).toBe(-1);
    expect(clampSlideIndex(deck, 0)).toBe(0);
    expect(clampSlideIndex(deck, 99)).toBe(2);
  });

  it('slideAt + phaseForSlideIndex derive position and phase', () => {
    expect(slideAt(deck, 1)?.id).toBe('sl-b');
    expect(slideAt(deck, -1)).toBeNull();
    expect(slideAt(null, 0)).toBeNull();
    expect(phaseForSlideIndex(deck, 2, 'connectRegulate')).toBe(
      'presentPerform',
    );
    expect(phaseForSlideIndex(deck, -1, 'connectRegulate')).toBe(
      'connectRegulate',
    );
  });

  it('slideInteractionIds covers every kind', () => {
    expect(slideInteractionIds(deck.slides[0])).toEqual([]);
    expect(slideInteractionIds(deck.slides[1])).toEqual(['ix-1', 'ix-2']);
    expect(slideInteractionIds(deck.slides[2])).toEqual(['ix-3']);
  });

  it('findInteraction + interactionsForSlide resolve against cells', () => {
    expect(findInteraction(snapshot, 'ix-2')?.type).toBe('text');
    expect(findInteraction(snapshot, 'missing')).toBeUndefined();
    const resolved = interactionsForSlide(snapshot, deck.slides[1]);
    expect(resolved.map((i) => i.id)).toEqual(['ix-1', 'ix-2']);
  });

  it('findDanglingInteractionIds reports unresolvable references', () => {
    // ix-3 (showcase slide) is not in any cell in this fixture.
    expect(findDanglingInteractionIds(snapshot)).toEqual(['ix-3']);
    expect(
      findDanglingInteractionIds({ ...snapshot, deck: undefined }),
    ).toEqual([]);
  });
});
