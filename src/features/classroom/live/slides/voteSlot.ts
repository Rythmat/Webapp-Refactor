import type { DaySnapshot } from '../../publish/publishDay';
import {
  isVoteSlide,
  leadingOption,
  voteActivities,
  voteCounts,
} from '../../slides/branches';
import type { VoteSlot } from '../../slides/parts/GroupVoteMenu';
import type { Slide } from '../../slides/types';
import type { InteractionResponsePayload } from '../../types';

/**
 * The class's vote on one screen (owner, 2026-11-16): each card's activity,
 * and the votes only where they may show. The room's screen and Present
 * show them once the teacher shares the vote; the teacher's dashboard
 * always (`always`). Undefined on any other slide.
 */
export const buildVoteSlot = ({
  snapshot,
  slide,
  responsesByEnrollment,
  sharedInteractionIds,
  always = false,
  ...rest
}: {
  snapshot: DaySnapshot;
  slide: Slide;
  responsesByEnrollment: Readonly<
    Record<string, Readonly<Record<string, InteractionResponsePayload>>>
  >;
  sharedInteractionIds: readonly string[];
  always?: boolean;
} & Pick<VoteSlot, 'mine' | 'onPick' | 'pickAction'>): VoteSlot | undefined => {
  if (slide.kind !== 'interaction' || !isVoteSlide(slide)) return undefined;
  const voteId = slide.interactionIds[0];
  if (!voteId) return undefined;
  const activities = voteActivities(snapshot, slide);
  const shown = always || sharedInteractionIds.includes(voteId);
  const counts = shown
    ? voteCounts(responsesByEnrollment, voteId, slide.branches?.length ?? 0)
    : null;
  return {
    activities,
    counts,
    leader: counts ? leadingOption(counts) : null,
    ...rest,
  };
};
