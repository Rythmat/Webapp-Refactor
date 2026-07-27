import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Interaction, InteractionResponse } from '../types';
import { AnonymousShareOverlay } from './AnonymousShareOverlay';
import { buildProjectorView } from './buildProjectorView';
import { ProjectorDeckView } from './slides/ProjectorDeckView';
import { useLiveResponses } from './useLiveResponses';
import { useSessionSync } from './useSessionSync';

export const ProjectorPage = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';

  const { state } = useSessionSync(sid, 'projector', cid);
  const { responsesByEnrollment } = useLiveResponses(sid);
  const { getPublishedDay } = usePublishedDays(cid);

  const publishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;

  const interactions = useMemo<Interaction[]>(() => {
    if (!publishedDay) return [];
    const flat: Interaction[] = [];
    for (const p of PHASES) {
      const cell = publishedDay.snapshot.cells[p];
      const ix = cell?.presentation?.interactions;
      if (Array.isArray(ix)) flat.push(...ix);
    }
    return flat;
  }, [publishedDay]);

  const sharedInteraction = useMemo<Interaction | undefined>(() => {
    if (!state) return undefined;
    const first = state.sharedInteractionIds[0];
    if (!first) return undefined;
    return interactions.find((i) => i.id === first);
  }, [state, interactions]);

  const responses = useMemo<InteractionResponse[]>(() => {
    if (!sharedInteraction || !state) return [];
    const nowIso = state.updatedAt;
    const out: InteractionResponse[] = [];
    for (const [enrollmentId, bag] of Object.entries(responsesByEnrollment)) {
      const payload = bag[sharedInteraction.id];
      if (!payload) continue;
      out.push({
        id: `proj-${enrollmentId}-${sharedInteraction.id}`,
        interactionId: sharedInteraction.id,
        enrollmentId,
        sessionId: sid,
        payload,
        createdAt: nowIso,
      });
    }
    return out;
  }, [sharedInteraction, responsesByEnrollment, sid, state]);

  // Deck sessions get the full-slide projected surface; legacy sessions
  // keep the cream anonymous-share overlay below. Guard on slides.length so an
  // empty deck (publishDay drops it; defensive here) falls through to the
  // legacy overlay instead of stranding the projector on "Get ready…".
  if (
    state &&
    publishedDay?.snapshot.deck &&
    publishedDay.snapshot.deck.slides.length > 0
  ) {
    return (
      <ProjectorDeckView
        snapshot={publishedDay.snapshot}
        state={state}
        sessionId={sid}
        responsesByEnrollment={responsesByEnrollment}
      />
    );
  }

  if (!state || !sharedInteraction) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#F7F1E3', color: '#1a1a1a' }}
      >
        <p className="max-w-lg px-8 text-center text-2xl font-medium">
          Waiting for the teacher to share…
        </p>
      </div>
    );
  }

  const projectorView = buildProjectorView(sharedInteraction, responses, sid);

  if (!projectorView.emit) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#F7F1E3', color: '#1a1a1a' }}
      >
        <p className="max-w-lg px-8 text-center text-2xl font-medium">
          Waiting for the teacher to share…
        </p>
      </div>
    );
  }

  return (
    <AnonymousShareOverlay
      projectorView={projectorView}
      interaction={sharedInteraction}
    />
  );
};
