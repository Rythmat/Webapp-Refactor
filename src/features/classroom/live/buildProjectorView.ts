/**
 * `buildProjectorView` — Rule 2b firewall selector.
 *
 * The projector view is what shows on the classroom's projected board when
 * the teacher toggles the anonymous share overlay on for a particular
 * interaction. This selector guarantees:
 *
 *   1. `check-in` interactions NEVER surface on the projector, at any depth.
 *   2. Interactions whose `shareable === false` NEVER surface either.
 *   3. When a shareable interaction IS projected, participant identifiers
 *      (enrollmentId, displayName) are structurally absent — the selector
 *      whitelists a small `{ anon, payload, createdAt }` shape and copies
 *      only those fields.
 *
 * The projector's WebSocket subscription on the server also strips
 * identifiers (see docs/classroom-v2/ws-protocol.md "Projector sockets");
 * this selector is belt-and-suspenders on the client side.
 */
import type {
  Interaction,
  InteractionResponse,
  InteractionResponsePayload,
} from '../types';

export interface ProjectorAnonymizedResponse {
  anon: string;
  createdAt: string;
  payload: InteractionResponsePayload;
}

export interface ProjectorView {
  emit: boolean;
  interactionId: string;
  reason?: 'not_shareable' | 'check_in' | 'showcase';
  responses: ProjectorAnonymizedResponse[];
}

/** Small deterministic anon derived from enrollmentId + a per-session salt. */
const anonymizeEnrollment = (enrollmentId: string, salt: string): string => {
  let hash = 0;
  const input = `${enrollmentId}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `anon-${(hash >>> 0).toString(36).padStart(6, '0').slice(0, 6)}`;
};

/**
 * Build the projector-side payload for a single interaction.
 *
 * @param interaction  The interaction being considered for projection.
 * @param allResponses The unfiltered response stream (any session/assignment).
 * @param salt         Per-session salt for anonymizing enrollmentIds. In
 *                     production, pass `session.id` so anons don't cross
 *                     sessions.
 */
export const buildProjectorView = (
  interaction: Interaction,
  allResponses: InteractionResponse[],
  salt: string,
): ProjectorView => {
  // Rule 2b: check-in is hard-refused regardless of the shareable flag.
  if (interaction.type === 'check-in') {
    return {
      emit: false,
      interactionId: interaction.id,
      reason: 'check_in',
      responses: [],
    };
  }

  // Rule 2b: showcase offers carry a student's project + identity — the raw
  // offer stream is teacher-only. Featuring is a separate, deliberate
  // `state.showcase` broadcast, never this anonymized reveal path.
  if (interaction.type === 'showcase') {
    return {
      emit: false,
      interactionId: interaction.id,
      reason: 'showcase',
      responses: [],
    };
  }

  // Rule 2b: teachers can also opt an interaction out of projection.
  if (!interaction.shareable) {
    return {
      emit: false,
      interactionId: interaction.id,
      reason: 'not_shareable',
      responses: [],
    };
  }

  const scoped = allResponses.filter((r) => r.interactionId === interaction.id);

  return {
    emit: true,
    interactionId: interaction.id,
    responses: scoped.map((r) => ({
      anon: anonymizeEnrollment(r.enrollmentId, salt),
      createdAt: r.createdAt,
      payload: r.payload,
    })),
  };
};
