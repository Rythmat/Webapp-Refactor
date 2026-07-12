/**
 * `buildParticipantView` — Rule 2a firewall selector.
 *
 * A student's client MUST never contain another participant's response
 * payload. This selector projects the raw response stream to include only
 * responses authored by the calling student's enrollment. The projection is
 * structural, not filter-then-hope: we build a new object that copies only
 * the whitelisted fields, so future response-shape extensions don't
 * accidentally leak peer identity.
 *
 * See docs/classroom-v2/ws-protocol.md "Student sockets" — the server also
 * refuses to broadcast peer responses to student sockets. This selector is
 * belt-and-suspenders on the client side.
 */
import type { InteractionResponse, InteractionResponsePayload } from '../types';

export interface ParticipantResponseView {
  id: string;
  interactionId: string;
  createdAt: string;
  payload: InteractionResponsePayload;
}

export interface ParticipantView {
  enrollmentId: string;
  interactionId?: string;
  responses: ParticipantResponseView[];
}

/**
 * Build the view of a session (or an assignment run) as it should appear on
 * a specific student's client. `interactionId` scopes the view when set;
 * omit it to see all of the student's responses.
 */
export const buildParticipantView = (
  allResponses: InteractionResponse[],
  myEnrollmentId: string,
  interactionId?: string,
): ParticipantView => {
  const scoped = allResponses.filter((r) => r.enrollmentId === myEnrollmentId);
  const inInteraction = interactionId
    ? scoped.filter((r) => r.interactionId === interactionId)
    : scoped;

  return {
    enrollmentId: myEnrollmentId,
    ...(interactionId ? { interactionId } : {}),
    responses: inInteraction.map((r) => ({
      id: r.id,
      interactionId: r.interactionId,
      createdAt: r.createdAt,
      payload: r.payload,
    })),
  };
};
