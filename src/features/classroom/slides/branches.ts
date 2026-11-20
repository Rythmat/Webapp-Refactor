/**
 * A class vote that picks where the lesson goes (owner, 2026-11-16): the
 * Group Project's vote slide names a slide for each of its options
 * (`branches`). Next on the vote goes to the one picked, and from there past
 * the others to what follows them; Prev retraces it. Every other slide steps
 * one at a time, as always. Pure: no React, unit-tested.
 */
import type { DaySnapshot } from '../publish/publishDay';
import type { Interaction, InteractionResponsePayload } from '../types';
import {
  deckFromSnapshot,
  interactionsForSlide,
  slideInteractionIds,
} from './deck';
import type { InteractionSlide, Slide, SlideDeck } from './types';

export interface VoteBranches {
  /** The vote's slide, and where it sits. */
  slide: InteractionSlide;
  voteIndex: number;
  /** The vote's interaction (the slide's first). */
  interactionId: string;
  /** Each option's slide index, in option order; -1 where it is gone. */
  optionIndices: number[];
  /** The slide after the last of them: where every branch goes next. */
  afterIndex: number;
}

/** A slide's vote branches, if it is a vote that has any left. */
export const branchesOf = (
  deck: SlideDeck,
  voteIndex: number,
): VoteBranches | null => {
  const slide = deck.slides[voteIndex];
  if (slide?.kind !== 'interaction' || !slide.branches?.length) return null;
  const interactionId = slide.interactionIds[0];
  if (!interactionId) return null;
  const optionIndices = slide.branches.map((id) =>
    deck.slides.findIndex((s) => s.id === id),
  );
  const present = optionIndices.filter((i) => i > voteIndex);
  if (present.length === 0) return null;
  return {
    slide,
    voteIndex,
    interactionId,
    optionIndices: optionIndices.map((i) => (i > voteIndex ? i : -1)),
    afterIndex: Math.max(...present) + 1,
  };
};

/** Every vote in a deck that leads somewhere. */
export const voteBranches = (deck: SlideDeck | null): VoteBranches[] =>
  deck
    ? deck.slides
        .map((_, i) => branchesOf(deck, i))
        .filter((b): b is VoteBranches => b !== null)
    : [];

/** Whether a slide is a vote that picks where the lesson goes. */
export const isVoteSlide = (slide: Slide | null | undefined): boolean =>
  slide?.kind === 'interaction' && Boolean(slide.branches?.length);

/** The option a vote's tally leads with: the most votes, ties to the first. */
export const leadingOption = (counts: readonly number[]): number | null => {
  let best: number | null = null;
  counts.forEach((n, i) => {
    if (n > 0 && (best === null || n > (counts[best] ?? 0))) best = i;
  });
  return best;
};

/** Each option's votes: every voter's latest choice. */
export const voteCounts = (
  responsesByEnrollment: Readonly<
    Record<string, Readonly<Record<string, InteractionResponsePayload>>>
  >,
  interactionId: string,
  options: number,
): number[] => {
  const counts = new Array<number>(options).fill(0);
  for (const bag of Object.values(responsesByEnrollment)) {
    const payload = bag[interactionId];
    if (payload?.kind !== 'choice') continue;
    for (const i of payload.choices)
      if (i >= 0 && i < options) counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts;
};

/**
 * Which option a vote goes to, for the one moving the lesson: the option
 * whose slide the class last stood on, else `preferred` (the vote's leader,
 * or a student's own vote), else the first that is still there.
 */
export type PickOption = (branches: VoteBranches) => number | null;

const targetOf = (branches: VoteBranches, pick: PickOption): number => {
  const picked = pick(branches);
  const index = picked !== null ? branches.optionIndices[picked] : undefined;
  if (index !== undefined && index >= 0) return index;
  return branches.optionIndices.find((i) => i >= 0) ?? branches.voteIndex + 1;
};

/** The vote whose branches hold `index`, as a branch or as what follows them. */
const enclosing = (
  deck: SlideDeck,
  index: number,
): { branches: VoteBranches; at: 'branch' | 'after' } | null => {
  for (const branches of voteBranches(deck)) {
    if (branches.optionIndices.includes(index))
      return { branches, at: 'branch' };
    if (index === branches.afterIndex) return { branches, at: 'after' };
  }
  return null;
};

const clamp = (deck: SlideDeck, index: number, from: number): number =>
  index >= 0 && index < deck.slides.length ? index : from;

/** The slide Next goes to; `index` itself when there is none. */
export const nextSlideIndex = (
  deck: SlideDeck,
  index: number,
  pick: PickOption,
): number => {
  if (index < 0) return deck.slides.length > 0 ? 0 : index;
  const vote = branchesOf(deck, index);
  if (vote) return targetOf(vote, pick);
  const around = enclosing(deck, index);
  if (around?.at === 'branch')
    return clamp(deck, around.branches.afterIndex, index);
  return clamp(deck, index + 1, index);
};

/** The slide Prev goes to; `index` itself when there is none. */
export const prevSlideIndex = (
  deck: SlideDeck,
  index: number,
  pick: PickOption,
): number => {
  if (index <= 0) return index;
  const around = enclosing(deck, index);
  if (around?.at === 'branch') return around.branches.voteIndex;
  if (around?.at === 'after') return targetOf(around.branches, pick);
  return index - 1;
};

/** The option of a vote whose slide is `index`, if it is one. */
export const optionAt = (
  branches: VoteBranches,
  index: number,
): number | null => {
  const option = branches.optionIndices.indexOf(index);
  return option >= 0 ? option : null;
};

/** Each option's activity: its Group Project slide's first interaction. */
export const voteActivities = (
  snapshot: DaySnapshot,
  slide: Slide,
): (Interaction | null)[] => {
  if (slide.kind !== 'interaction' || !slide.branches) return [];
  const deck = deckFromSnapshot(snapshot);
  return slide.branches.map((id) => {
    const branch = deck?.slides.find((s) => s.id === id);
    return branch ? (interactionsForSlide(snapshot, branch)[0] ?? null) : null;
  });
};

/**
 * The Group Projects a class didn't go to: a vote's branches nobody answered
 * on and the vote didn't lead to. A report leaves them out, so the two the
 * class passed over don't read as 0 of N.
 */
export const untakenBranchIds = (
  deck: SlideDeck | null | undefined,
  responsesByEnrollment: Readonly<
    Record<string, Readonly<Record<string, InteractionResponsePayload>>>
  >,
): Set<string> => {
  const untaken = new Set<string>();
  if (!deck) return untaken;
  const bags = Object.values(responsesByEnrollment);
  for (const b of voteBranches(deck)) {
    const leader = leadingOption(
      voteCounts(
        responsesByEnrollment,
        b.interactionId,
        b.optionIndices.length,
      ),
    );
    b.optionIndices.forEach((index, option) => {
      const slide = deck.slides[index];
      if (!slide || option === leader) return;
      const ids = slideInteractionIds(slide);
      if (!bags.some((bag) => ids.some((id) => bag[id] !== undefined)))
        untaken.add(slide.id);
    });
  }
  return untaken;
};
