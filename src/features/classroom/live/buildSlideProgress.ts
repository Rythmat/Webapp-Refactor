/**
 * buildSlideProgress — pure derivation of per-student progress for a slide,
 * used by the teacher dashboard for app-route slides (the "N in module · N done"
 * strip + RosterPanel dots). Response data is identified here (teacher-only, per
 * Rule 2); it never reaches the projector path.
 *
 * State per enrollment over the slide's interaction ids:
 *   done        — every id has a completed response (or a matching inbox entry)
 *   in_module   — an atlas response exists but only the `{status:'launched'}` marker
 *   not_started — otherwise
 *
 * Non-app-route slides have no launch markers, so they degrade to a binary
 * not_started/done and callers don't need to branch.
 */
import type { MindMapSubmission } from '@/content/graph/mindMapBoard';
import type { Enrollment } from '../enrollments/enrollmentsStore';
import type { MspResponseEntry } from '../msp/mspResponseInbox';
import { slideInteractionIds } from '../slides/deck';
import type { Slide } from '../slides/types';
import type { InteractionResponsePayload } from '../types';

export type SlideProgressState = 'not_started' | 'in_module' | 'done';

export interface SlideProgress {
  perStudent: Record<string, SlideProgressState>;
  counts: {
    notStarted: number;
    inModule: number;
    done: number;
    total: number;
  };
}

/**
 * True when an atlas response result represents completion (vs the immediate
 * `{status:'launched'}` marker). Shared with the progress-ledger mirror so both
 * gate on the SAME notion of "done".
 */
export const isAtlasResultComplete = (result: unknown): boolean => {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  if (r.status === 'launched') return false;
  return (
    r.completion === true ||
    r.completed === true ||
    r.kind === 'completion' ||
    r.kind === 'mindMap' ||
    typeof r.score === 'number' ||
    'artifactRef' in r
  );
};

/**
 * A student's submitted mind map for an interaction (a Promoter slide): from
 * their response, or from the inbox when it arrived while their live tab was
 * closed.
 */
export const submittedMindMap = (
  responses: Record<string, InteractionResponsePayload> | undefined,
  inbox: ReadonlyArray<MspResponseEntry>,
  interactionId: string,
  enrollmentId: string,
): MindMapSubmission | undefined => {
  const payload = responses?.[interactionId];
  if (payload?.kind === 'atlas') {
    const result = payload.result as {
      kind?: unknown;
      map?: MindMapSubmission;
    };
    if (result?.kind === 'mindMap' && result.map) return result.map;
  }
  for (const entry of inbox)
    if (
      entry.interactionId === interactionId &&
      entry.participant.enrollmentId === enrollmentId &&
      entry.payload.kind === 'mindMap'
    )
      return entry.payload.map;
  return undefined;
};

const hasInboxCompletion = (
  entries: ReadonlyArray<MspResponseEntry>,
  interactionId: string,
  enrollmentId: string,
): boolean =>
  entries.some(
    (e) =>
      e.interactionId === interactionId &&
      e.participant.enrollmentId === enrollmentId &&
      (e.payload.kind === 'completion' ||
        e.payload.kind === 'score' ||
        e.payload.kind === 'artifact' ||
        e.payload.kind === 'mindMap'),
  );

export const buildSlideProgress = (
  roster: ReadonlyArray<Pick<Enrollment, 'id'>>,
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >,
  mspInboxEntries: ReadonlyArray<MspResponseEntry>,
  slide: Slide,
): SlideProgress => {
  const ids = slideInteractionIds(slide);
  const perStudent: Record<string, SlideProgressState> = {};
  let notStarted = 0;
  let inModule = 0;
  let done = 0;

  for (const { id: enrollmentId } of roster) {
    const bag = responsesByEnrollment[enrollmentId] ?? {};

    const idDone = (iid: string): boolean => {
      const payload = bag[iid];
      if (payload) {
        if (payload.kind !== 'atlas') return true;
        if (isAtlasResultComplete(payload.result)) return true;
      }
      return hasInboxCompletion(mspInboxEntries, iid, enrollmentId);
    };

    const idLaunched = (iid: string): boolean => {
      const payload = bag[iid];
      return (
        payload?.kind === 'atlas' &&
        (payload.result as { status?: string })?.status === 'launched'
      );
    };

    let state: SlideProgressState;
    if (ids.length > 0 && ids.every(idDone)) {
      state = 'done';
      done += 1;
    } else if (ids.some(idLaunched)) {
      state = 'in_module';
      inModule += 1;
    } else {
      state = 'not_started';
      notStarted += 1;
    }
    perStudent[enrollmentId] = state;
  }

  return {
    perStudent,
    counts: { notStarted, inModule, done, total: roster.length },
  };
};
