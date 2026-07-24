import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import type { DaySnapshot } from '../../publish/publishDay';
import { deckFromSnapshot, interactionsForSlide, slideAt } from '../../slides/deck';
import { SlideRenderer } from '../../slides/SlideRenderer';
import { fromProjectorView } from '../../slides/viz/buildVizAggregate';
import { ParticipationPulse } from '../../slides/viz/ParticipationPulse';
import { RevealViz } from '../../slides/viz/RevealViz';
import type {
  Interaction,
  InteractionResponse,
  InteractionResponsePayload,
} from '../../types';
import { buildProjectorView } from '../buildProjectorView';
import type { SessionState } from '../sessionsStore';
import { ShowcaseProjectorFrame } from './ShowcaseProjectorFrame';
import { TimerCountdown } from './TimerCountdown';

interface ProjectorDeckViewProps {
  snapshot: DaySnapshot;
  state: SessionState;
  sessionId: string;
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
}

/**
 * The projected (public) surface for a deck session. Rule 2 is enforced in
 * layers: the reveal slot only lights up while the teacher shares that exact
 * interaction, every response passes through `buildProjectorView` (check-in +
 * non-shareable hard-refused, identities stripped), and the viz constructor's
 * input type is `ProjectorView` — identified rows cannot compile into it.
 * The participation chip uses response COUNTS only, never payloads.
 */
export const ProjectorDeckView = ({
  snapshot,
  state,
  sessionId,
  responsesByEnrollment,
}: ProjectorDeckViewProps) => {
  const reducedMotion = useReducedMotion();
  const deck = deckFromSnapshot(snapshot);
  const slideIndex = state.slideIndex ?? -1;
  const slide = slideAt(deck, slideIndex);

  const countFor = useMemo(() => {
    return (interactionId: string): number => {
      let count = 0;
      for (const bag of Object.values(responsesByEnrollment)) {
        if (bag[interactionId]) count += 1;
      }
      return count;
    };
  }, [responsesByEnrollment]);

  if (!slide) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#141416]">
        <p className="max-w-lg px-8 text-center text-3xl font-medium text-white/70">
          Get ready… · Prepárate…
        </p>
      </div>
    );
  }

  const interactions = interactionsForSlide(snapshot, slide);

  const revealSlot = (interaction: Interaction) => {
    if (!state.sharedInteractionIds.includes(interaction.id)) return null;
    const responses: InteractionResponse[] = [];
    for (const [enrollmentId, bag] of Object.entries(responsesByEnrollment)) {
      const payload = bag[interaction.id];
      if (!payload) continue;
      responses.push({
        id: `proj-${enrollmentId}-${interaction.id}`,
        interactionId: interaction.id,
        enrollmentId,
        sessionId,
        payload,
        createdAt: state.updatedAt,
      });
    }
    const view = buildProjectorView(interaction, responses, sessionId);
    if (!view.emit) return null;
    const viz = fromProjectorView(interaction, view, 'both');
    if (!viz) return null;
    const revealHint = slide.kind === 'interaction' ? slide.reveal : undefined;
    return (
      <RevealViz viz={viz} reveal={revealHint} size="projector" language="both" />
    );
  };

  const firstInteractionId = interactions[0]?.id;
  const statusChip = firstInteractionId ? (
    <ParticipationPulse
      responded={countFor(firstInteractionId)}
      language="both"
    />
  ) : undefined;

  // Showcase: the projector shows ONLY the single teacher-featured project
  // (state.showcase) — never the raw offer stream.
  const showcaseFrame =
    slide.kind === 'showcase' && state.showcase ? (
      <ShowcaseProjectorFrame showcase={state.showcase} />
    ) : undefined;

  const timer =
    state.timer && state.timer.slideId === slide.id ? state.timer : null;

  // Remote play/pause command for THIS slide's video (Phase 4).
  const mediaCommand =
    state.media && state.media.slideId === slide.id
      ? {
          action: state.media.action,
          ...(state.media.atSec !== undefined
            ? { atSec: state.media.atSec }
            : {}),
          cmdId: state.media.cmdId,
        }
      : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#141416]">
      {timer && (
        <div className="absolute right-8 top-8 z-10">
          <TimerCountdown endsAt={timer.endsAt} size="projector" />
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.id}
          className="h-full w-full"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <SlideRenderer
            slide={slide}
            surface="projector"
            language="both"
            interactions={interactions}
            slots={{
              reveal: revealSlot,
              statusChip,
              showcaseFrame,
              mediaCommand,
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
