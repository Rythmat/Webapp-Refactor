import { ArrowLeft, Lock, Share2, StopCircle, Unlock } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { InteractionResponseDashboard } from '../assignments/InteractionResponseDashboard';
import { useEnrollments } from '../enrollments';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Interaction } from '../types';
import { PhaseNavigator } from './PhaseNavigator';
import { RosterPanel } from './RosterPanel';
import { SessionSimulationPanel } from './SessionSimulationPanel';
import { useLiveResponses } from './useLiveResponses';
import { useSessionSync } from './useSessionSync';

export const TeacherSessionDashboard = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';
  const navigate = useNavigate();

  const { state, sendNav, sendLock, sendShare, sendMode, sendEnd } =
    useSessionSync(sid, 'teacher');
  const { aggregate, countResponses, responsesByEnrollment } =
    useLiveResponses(sid);
  const { getPublishedDay } = usePublishedDays(cid);
  const { getEnrollment } = useEnrollments(cid);

  const publishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;

  const allInteractions: Interaction[] = useMemo(() => {
    if (!publishedDay) return [];
    const flat: Interaction[] = [];
    for (const p of PHASES) {
      const cell = publishedDay.snapshot.cells[p];
      const ix = cell?.presentation?.interactions;
      if (Array.isArray(ix)) flat.push(...ix);
    }
    return flat;
  }, [publishedDay]);

  const currentInteractions = useMemo(() => {
    if (!state || !publishedDay) return [];
    const cell = publishedDay.snapshot.cells[state.currentPhase];
    return cell?.presentation?.interactions ?? [];
  }, [state, publishedDay]);

  const aggregateRows = useMemo(
    () => aggregate(allInteractions, (id) => getEnrollment(id)?.displayName),
    [aggregate, allInteractions, getEnrollment],
  );

  if (!state) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10 text-white">
        <p className="text-sm text-white/60">Session not found.</p>
        <Link
          to={ClassroomRoutes.plan({ classroomId: cid })}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plan
        </Link>
      </div>
    );
  }

  const handleEnd = () => {
    sendEnd();
    navigate(ClassroomRoutes.report({ classroomId: cid, sessionId: sid }));
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.plan({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plan
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-1 text-xs text-emerald-200">
            Live · {countResponses()} response(s)
          </span>
          <RosterPanel
            classroomId={cid}
            currentInteractions={currentInteractions}
            responsesByEnrollment={responsesByEnrollment}
          />
          <button
            type="button"
            onClick={() =>
              sendMode(
                state.mode === 'teacher_paced'
                  ? 'student_paced'
                  : 'teacher_paced',
              )
            }
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
          >
            {state.mode === 'teacher_paced' ? 'Teacher-paced' : 'Student-paced'}
          </button>
          <button
            type="button"
            onClick={() => sendLock(!state.locked)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ' +
              (state.locked
                ? 'bg-amber-400 text-black hover:bg-amber-300'
                : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white')
            }
          >
            {state.locked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            {state.locked ? 'Unlock devices' : 'Lock devices'}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-200 hover:border-red-400 hover:text-red-100"
          >
            <StopCircle className="h-3.5 w-3.5" />
            End
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Current phase
        </span>
        <PhaseNavigator
          currentPhase={state.currentPhase}
          onNavigate={sendNav}
          mode={state.mode}
        />
      </div>

      {currentInteractions.length === 0 ? (
        <p className="text-sm text-white/50">
          No interactions on this phase — students see title + prompt only.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {currentInteractions.map((interaction) => (
            <ShareRow
              key={interaction.id}
              interaction={interaction}
              shared={state.sharedInteractionIds.includes(interaction.id)}
              onToggle={(on) => sendShare(interaction.id, on)}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <InteractionResponseDashboard aggregate={aggregateRows} />
      </div>

      {import.meta.env.DEV && (
        <SessionSimulationPanel
          classroomId={cid}
          sessionId={sid}
          publishedDay={publishedDay}
          currentPhase={state.currentPhase}
        />
      )}
    </div>
  );
};

interface ShareRowProps {
  interaction: Interaction;
  shared: boolean;
  onToggle: (on: boolean) => void;
}

const ShareRow = ({ interaction, shared, onToggle }: ShareRowProps) => {
  const canShare =
    interaction.type !== 'check-in' && interaction.shareable !== false;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm text-white/80">{interaction.question.en}</span>
        <span className="text-xs uppercase tracking-wide text-white/40">
          {interaction.type}
        </span>
      </div>
      <button
        type="button"
        onClick={() => canShare && onToggle(!shared)}
        disabled={!canShare}
        title={
          canShare
            ? undefined
            : interaction.type === 'check-in'
              ? 'Check-ins are structurally teacher-only.'
              : 'This interaction is not shareable.'
        }
        className={
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ' +
          (!canShare
            ? 'cursor-not-allowed border border-white/[0.06] text-white/30'
            : shared
              ? 'bg-white text-black hover:bg-white/85'
              : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white')
        }
      >
        <Share2 className="h-3.5 w-3.5" />
        {shared ? 'Sharing' : 'Share'}
      </button>
    </div>
  );
};
