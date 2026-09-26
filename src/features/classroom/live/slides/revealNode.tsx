/**
 * The ONE builder for a revealed interaction's visualization.
 *
 * Both projected surfaces use it — `ProjectorDeckView` and the teacher's
 * `SessionPresentView`. That is deliberate: the Capstone requires the teacher's
 * Present view and the projector to "agree zone for zone", and in a
 * single-screen classroom Present IS what the class sees. Two copies of this
 * gating would drift, and the way they would drift is Present showing
 * IDENTIFIED responses on a projected screen.
 *
 * Every Rule 2 gate lives here and nowhere else:
 *   - nothing renders unless the teacher has shared this exact interaction;
 *   - `buildProjectorView` refuses check-in and showcase payloads at any depth
 *     and strips participant identifiers;
 *   - `fromProjectorView` builds the aggregate from that stripped view only.
 */
import type { ReactNode } from 'react';
import { RevealViz } from '../../slides/viz/RevealViz';
import { fromProjectorView } from '../../slides/viz/buildVizAggregate';
import type { Interaction, InteractionResponse } from '../../types';
import { buildProjectorView } from '../buildProjectorView';

export interface BuildRevealInput {
  interaction: Interaction;
  /** enrollmentId (or anon, on a projector socket) → interactionId → payload. */
  responsesByEnrollment: Record<string, Record<string, unknown>>;
  sessionId: string;
  sharedInteractionIds: string[];
  updatedAt: string;
  /** The slide's projector aggregate style, when it declares one. */
  revealHint?: 'bars' | 'wall' | 'words' | 'scale';
  /** Height of the reveal band in design px, so a card wall can size its cap. */
  availableHeight?: number;
  size?: 'projector' | 'panel';
}

export const buildRevealNode = ({
  interaction,
  responsesByEnrollment,
  sessionId,
  sharedInteractionIds,
  updatedAt,
  revealHint,
  availableHeight,
  size = 'projector',
}: BuildRevealInput): ReactNode => {
  if (!sharedInteractionIds.includes(interaction.id)) return null;

  const responses: InteractionResponse[] = [];
  for (const [participantKey, bag] of Object.entries(responsesByEnrollment)) {
    const payload = bag[interaction.id];
    if (!payload) continue;
    responses.push({
      id: `proj-${participantKey}-${interaction.id}`,
      interactionId: interaction.id,
      enrollmentId: participantKey,
      sessionId,
      payload,
      createdAt: updatedAt,
    } as InteractionResponse);
  }

  const view = buildProjectorView(interaction, responses, sessionId);
  if (!view.emit) return null;
  const viz = fromProjectorView(interaction, view, 'both');
  if (!viz) return null;

  return (
    <RevealViz
      viz={viz}
      reveal={revealHint}
      size={size}
      language="both"
      availableHeight={availableHeight}
    />
  );
};
