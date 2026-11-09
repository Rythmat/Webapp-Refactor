/**
 * DEV only: a class's live session on one page, in memory.
 *
 * The dev class page (/dev/echo/classroom) puts the teacher's panel, the
 * projector and students side by side. They talk over this bus, in the
 * session's own message shapes: a teacher's body goes through the store's
 * role gate and reducer (sessionsStore.ts `roleCanSend`,
 * `applyBodyToState`), a student's `response` is upserted per student and
 * interaction, as the local mock and the server do. Nothing is written to
 * localStorage, so the page never touches a real session.
 *
 * Every role reads the same state, as every socket gets the same state
 * broadcasts; only the teacher's screen reads `responses` and `presence`
 * (Rule 2).
 */

import {
  applyBodyToState,
  roleCanSend,
  type PresenceStateValue,
  type SessionMessageBody,
  type SessionRole,
  type SessionState,
} from '../../live/sessionsStore';
import type { InteractionResponsePayload } from '../../types';

export interface EchoClassBusSnapshot {
  state: SessionState;
  /** enrollment → interaction → payload: the teacher's only. */
  responses: Record<string, Record<string, InteractionResponsePayload>>;
  /** enrollment → presence: the teacher's only. */
  presence: Record<string, PresenceStateValue>;
  /** Messages carried, for the page's counter. */
  messages: number;
}

export interface EchoClassBus {
  snapshot(): EchoClassBusSnapshot;
  subscribe(listener: () => void): () => void;
  /** A message from a role; false when the role may not send it. */
  send(
    from: SessionRole,
    body: SessionMessageBody,
    fromEnrollmentId?: string,
  ): boolean;
  setPresence(enrollmentId: string, state: PresenceStateValue | null): void;
}

/** A fresh session on the bus, on its first slide. */
export function createEchoClassBus({
  sessionId,
  classroomId,
  publishedDayId = 'dev-day',
}: {
  sessionId: string;
  classroomId: string;
  publishedDayId?: string;
}): EchoClassBus {
  const now = new Date().toISOString();
  let snap: EchoClassBusSnapshot = {
    state: {
      sessionId,
      classroomId,
      publishedDayId,
      teacherId: 'dev-teacher',
      currentPhase: 'groupPractice',
      slideIndex: 0,
      mode: 'teacher_paced',
      locked: false,
      sharedInteractionIds: [],
      status: 'live',
      startedAt: now,
      updatedAt: now,
    },
    responses: {},
    presence: {},
    messages: 0,
  };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    snapshot: () => snap,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send(from, body, fromEnrollmentId) {
      if (!roleCanSend(from, body)) return false;
      if (body.kind === 'response') {
        // The server stamps who sent it; a student can't answer for another.
        const enrollmentId =
          from === 'student'
            ? (fromEnrollmentId ?? body.enrollmentId)
            : body.enrollmentId;
        const bag = { ...(snap.responses[enrollmentId] ?? {}) };
        bag[body.interactionId] = body.payload;
        snap = {
          ...snap,
          responses: { ...snap.responses, [enrollmentId]: bag },
          messages: snap.messages + 1,
        };
      } else if (body.kind === 'position') {
        snap = { ...snap, messages: snap.messages + 1 };
      } else {
        snap = {
          ...snap,
          state: applyBodyToState(snap.state, body, new Date().toISOString()),
          messages: snap.messages + 1,
        };
      }
      emit();
      return true;
    },
    setPresence(enrollmentId, state) {
      const presence = { ...snap.presence };
      if (state === null) delete presence[enrollmentId];
      else presence[enrollmentId] = state;
      snap = { ...snap, presence };
      emit();
    },
  };
}
