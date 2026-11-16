/**
 * The class's vote picks where the lesson goes (owner, 2026-11-16): Next on
 * the vote goes to the Group Project picked, and from there past the
 * others; Prev retraces it.
 */
import { describe, expect, it } from 'vitest';
import type { InteractionResponsePayload } from '../types';
import {
  leadingOption,
  nextSlideIndex,
  prevSlideIndex,
  untakenBranchIds,
  voteBranches,
  voteCounts,
  type PickOption,
} from './branches';
import type { Slide, SlideDeck } from './types';

const content = (id: string): Slide => ({
  id,
  kind: 'content',
  phase: 'connectRegulate',
  title: { en: id },
});
const group = (id: string): Slide => ({
  id,
  kind: 'app-route',
  phase: 'groupPractice',
  title: { en: id },
  interactionId: `ix-${id}`,
});

const deckWith = (branches: string[]): SlideDeck => ({
  id: 'deck',
  title: { en: 'Deck' },
  slides: [
    content('globe'), // 0
    {
      id: 'vote', // 1
      kind: 'interaction',
      phase: 'groupPractice',
      title: { en: 'Vote' },
      interactionIds: ['ix-vote'],
      branches,
    },
    group('promoter'), // 2
    group('producer'), // 3
    group('performer'), // 4
    content('project'), // 5
  ],
});
const deck = deckWith(['promoter', 'producer', 'performer']);

const pick =
  (option: number | null): PickOption =>
  () =>
    option;

describe('next and prev around the class vote', () => {
  it('goes from the vote to the option picked, else the first', () => {
    expect(nextSlideIndex(deck, 1, pick(1))).toBe(3);
    expect(nextSlideIndex(deck, 1, pick(2))).toBe(4);
    expect(nextSlideIndex(deck, 1, pick(null))).toBe(2);
  });

  it('goes from any Group Project past the others, and back to the vote', () => {
    for (const i of [2, 3, 4]) {
      expect(nextSlideIndex(deck, i, pick(null))).toBe(5);
      expect(prevSlideIndex(deck, i, pick(null))).toBe(1);
    }
  });

  it('goes back from after them to the one picked', () => {
    expect(prevSlideIndex(deck, 5, pick(2))).toBe(4);
    expect(prevSlideIndex(deck, 5, pick(null))).toBe(2);
  });

  it('steps one at a time everywhere else, and stops at the ends', () => {
    expect(nextSlideIndex(deck, 0, pick(null))).toBe(1);
    expect(prevSlideIndex(deck, 1, pick(null))).toBe(0);
    expect(nextSlideIndex(deck, 5, pick(null))).toBe(5);
    expect(prevSlideIndex(deck, 0, pick(null))).toBe(0);
    expect(nextSlideIndex(deck, -1, pick(null))).toBe(0);
  });

  it('skips an option whose slide the deck lost', () => {
    const lost = deckWith(['promoter', 'gone', 'performer']);
    const [b] = voteBranches(lost);
    expect(b?.optionIndices).toEqual([2, -1, 4]);
    // Picked the lost one: its first that is still there.
    expect(nextSlideIndex(lost, 1, pick(1))).toBe(2);
    // The producer slide is no longer a branch: an ordinary step.
    expect(nextSlideIndex(lost, 3, pick(null))).toBe(4);
  });

  it('is an ordinary slide when no branch is left', () => {
    const none = deckWith(['gone']);
    expect(voteBranches(none)).toEqual([]);
    expect(nextSlideIndex(none, 1, pick(0))).toBe(2);
  });
});

describe('the vote’s count', () => {
  const vote = (i: number): InteractionResponsePayload => ({
    kind: 'choice',
    choices: [i],
  });

  it('counts each voter’s latest choice, the leader with ties to the first', () => {
    const counts = voteCounts(
      {
        e1: { 'ix-vote': vote(2) },
        e2: { 'ix-vote': vote(1) },
        e3: { 'ix-vote': vote(2) },
        e4: { other: vote(0) },
      },
      'ix-vote',
      3,
    );
    expect(counts).toEqual([0, 1, 2]);
    expect(leadingOption(counts)).toBe(2);
    expect(leadingOption([1, 1, 0])).toBe(0);
    expect(leadingOption([0, 0, 0])).toBeNull();
  });

  it('leaves out the Group Projects the class passed over', () => {
    const untaken = untakenBranchIds(deck, {
      e1: { 'ix-vote': vote(1), 'ix-producer': { kind: 'text', text: 'x' } },
      e2: { 'ix-vote': vote(1) },
    });
    expect([...untaken].sort()).toEqual(['performer', 'promoter']);
    // Nobody has done the leader's yet: it stays.
    expect(
      untakenBranchIds(deck, { e1: { 'ix-vote': vote(2) } }).has('performer'),
    ).toBe(false);
  });
});
