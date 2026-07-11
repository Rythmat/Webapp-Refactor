import type { Challenge, ChallengeEvent } from './types';

/** Parse the curriculum genre id from a lesson id like `curriculum:JAZZ:L1`. */
export function curriculumGenreOf(lessonId: string): string | null {
  if (!lessonId.startsWith('curriculum:')) return null;
  return lessonId.split(':')[1] ?? null;
}

export function eventMatchesCriteria(
  event: ChallengeEvent,
  challenge: Challenge,
): boolean {
  const { criteria } = challenge;

  switch (event.kind) {
    case 'lesson_completed':
      if (criteria.kind !== 'complete_lesson') return false;
      // Exact lesson, else genre-filtered, else any lesson.
      if (criteria.lessonId) return criteria.lessonId === event.lessonId;
      if (criteria.genre)
        return curriculumGenreOf(event.lessonId) === criteria.genre;
      return true;
    case 'activity_completed':
      return (
        criteria.kind === 'complete_activity' &&
        criteria.activityId === event.activityId
      );
    case 'arcade_streak':
      // Specific game, else any game — always requires the streak threshold.
      return (
        criteria.kind === 'arcade_streak' &&
        (!criteria.game || criteria.game === event.game) &&
        event.count >= criteria.threshold
      );
    case 'studio_invite':
      return criteria.kind === 'studio_invite' && criteria.minInvites >= 1;
    default:
      return false;
  }
}
