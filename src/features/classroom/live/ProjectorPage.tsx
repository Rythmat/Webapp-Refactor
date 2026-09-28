import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import { useSanitizedPublishedDay } from '../publish/useRuleOneReadGuard';
import type { Interaction, InteractionResponse } from '../types';
import { AnonymousShareOverlay } from './AnonymousShareOverlay';
import { ConnectionBadge } from './ConnectionBadge';
import { buildProjectorView } from './buildProjectorView';
import type { SessionState } from './sessionsStore';
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

  // ONE socket. The surface receives the session it needs as props rather than
  // calling `useSessionSync` again, which would open a second connection.
  const { state, connectionStatus } = useSessionSync(sid, 'projector', cid);

  return (
    <>
      <ProjectorSurface classroomId={cid} sessionId={sid} state={state} />
      {/* NO SILENT MOCKS. A healthy projected board stays chrome-free; a
          practice or dropped session is unmissable from the back of the room. */}
      {connectionStatus !== 'connected' && (
        <div className="pointer-events-none fixed right-4 top-4 z-50">
          <ConnectionBadge status={connectionStatus} />
        </div>
      )}
    </>
  );
};

interface ProjectorSurfaceProps {
  classroomId: string;
  sessionId: string;
  state: SessionState | null;
}

/**
 * The projected board itself. Kept separate so `ProjectorPage` can mount the
 * status overlay exactly once, above whichever of the five surfaces renders.
 */
const ProjectorSurface = ({
  classroomId: cid,
  sessionId: sid,
  state,
}: ProjectorSurfaceProps) => {
  const { responsesByEnrollment } = useLiveResponses(sid);
  const { getPublishedDay } = usePublishedDays(cid);

  const storedPublishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;
  // Rule 1, read path: strip rather than blank. The projector is the one screen
  // the whole class is looking at — it must render.
  const { day: publishedDay } = useSanitizedPublishedDay(
    storedPublishedDay,
    'projector',
    cid,
  );

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

  // The teacher ended the session — clear the class screen instead of freezing
  // on the last slide (mirrors the student "Session ended" screen).
  if (state?.status === 'ended') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0d0f] text-center text-white">
        <span className="text-3xl font-medium">Session ended</span>
        <span className="text-lg text-white/55">Sesión terminada</span>
      </div>
    );
  }

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
