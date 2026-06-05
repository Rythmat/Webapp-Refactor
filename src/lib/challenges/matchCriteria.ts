import type { Challenge, ChallengeEvent } from './types';

export function eventMatchesCriteria(
  event: ChallengeEvent,
  challenge: Challenge,
): boolean {
  const { criteria } = challenge;

  switch (event.kind) {
    case 'lesson_completed':
      return (
        criteria.kind === 'complete_lesson' &&
        criteria.lessonId === event.lessonId
      );
    case 'activity_completed':
      return (
        criteria.kind === 'complete_activity' &&
        criteria.activityId === event.activityId
      );
    case 'arcade_streak':
      return (
        criteria.kind === 'arcade_streak' &&
        criteria.game === event.game &&
        event.count >= criteria.threshold
      );
    case 'studio_invite':
      return criteria.kind === 'studio_invite' && criteria.minInvites >= 1;
    default:
      return false;
  }
}
