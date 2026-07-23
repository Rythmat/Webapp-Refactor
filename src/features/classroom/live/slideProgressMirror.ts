/**
 * slideProgressMirror — maps an app-route COMPLETION into a progress-ledger
 * patch (`PATCH /api/progress/activity`, lessonId `slides:<deckId>`), so slide
 * work shows up in the student's own progress. Pure + tested.
 *
 * Gated on `isAtlasResultComplete` (NOT raw `kind==='atlas'`) so the immediate
 * `{status:'launched'}` marker never writes a false COMPLETED — the shared
 * `handleSubmit` choke point fires for every payload, including that marker.
 */
import type { ProgressActivityPatch } from '@/lib/progress/types';
import type { Interaction, InteractionResponsePayload } from '../types';
import { isAtlasResultComplete } from './buildSlideProgress';

export const SLIDES_LESSON_VERSION = 1;

export const slidesLessonId = (deckId: string): string => `slides:${deckId}`;

export const buildSlideProgressPatch = (
  deckId: string,
  interaction: Interaction,
  payload: InteractionResponsePayload,
): ProgressActivityPatch | null => {
  if (payload.kind !== 'atlas') return null;
  if (!interaction.atlas) return null;
  if (!isAtlasResultComplete(payload.result)) return null;

  const rawScore = (payload.result as { score?: unknown }).score;
  return {
    activityInstanceId: interaction.id,
    lessonId: slidesLessonId(deckId),
    lessonVersion: SLIDES_LESSON_VERSION,
    activityDefId: interaction.atlas.activityRef,
    mode: '',
    root: '',
    status: 'COMPLETED',
    attemptsDelta: 1,
    score: typeof rawScore === 'number' ? rawScore : null,
  };
};
