import {
  ArrowLeft,
  Lock,
  Play,
  Share2,
  StopCircle,
  Unlock,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { InteractionResponseDashboard } from '../assignments/InteractionResponseDashboard';
import { useEnrollments } from '../enrollments';
import { useMspInboxEntries } from '../msp';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import { SlideRenderer } from '../slides/SlideRenderer';
import {
  deckFromSnapshot,
  interactionsForSlide,
  slideAt,
  slideInteractionIds,
} from '../slides/deck';
import type { Interaction } from '../types';
import { CurriculumCoveragePanel } from './CurriculumCoveragePanel';
import { PhaseNavigator } from './PhaseNavigator';
import { RosterPanel } from './RosterPanel';
import { SessionPresentView } from './SessionPresentView';
import { buildSlideProgress } from './buildSlideProgress';
import { CurrentSlidePanel } from './slides/CurrentSlidePanel';
import { MediaRemote } from './slides/MediaRemote';
import { PairingPanel } from './slides/PairingPanel';
import { ShowcasePanel } from './slides/ShowcasePanel';
import { SlideStrip } from './slides/SlideStrip';
import { TimerControl } from './slides/TimerControl';
import { useLiveResponses } from './useLiveResponses';
import { useSessionPositions } from './useSessionPositions';
import { useSessionSync } from './useSessionSync';

export const TeacherSessionDashboard = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';
  const navigate = useNavigate();

  const {
    state,
    sendNav,
    sendLock,
    sendShare,
    sendMode,
    sendEnd,
    sendPairs,
    sendShowcase,
    sendTimer,
    sendMedia,
  } = useSessionSync(sid, 'teacher', cid);
  const { aggregate, countResponses, responsesByEnrollment } =
    useLiveResponses(sid);
  const positions = useSessionPositions(sid);
  const { getPublishedDay } = usePublishedDays(cid);
  const { getEnrollment, active: activeEnrollments } = useEnrollments(cid);

  const [presenting, setPresenting] = useState(false);

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

  const snapshot = publishedDay?.snapshot;
  const deck = deckFromSnapshot(snapshot);
  const slideIndex = state?.slideIndex ?? -1;
  const currentSlide = slideAt(deck, slideIndex);
  const currentSlideInteractions = useMemo(
    () =>
      snapshot && currentSlide
        ? interactionsForSlide(snapshot, currentSlide)
        : [],
    [snapshot, currentSlide],
  );

  // App-route slides show live module progress instead of a response aggregate.
  // The inbox observer catches completions that arrive while a student's tab is
  // closed (never consumes — that's the student's useMspReport).
  const mspInboxEntries = useMspInboxEntries();
  const slideProgress = useMemo(
    () =>
      currentSlide?.kind === 'app-route'
        ? buildSlideProgress(
            activeEnrollments,
            responsesByEnrollment,
            mspInboxEntries,
            currentSlide,
          )
        : null,
    [currentSlide, activeEnrollments, responsesByEnrollment, mspInboxEntries],
  );
  const appRouteProgress = useMemo(
    () =>
      slideProgress
        ? {
            rows: activeEnrollments.map((e) => ({
              enrollmentId: e.id,
              displayName: e.displayName,
              state: slideProgress.perStudent[e.id] ?? 'not_started',
            })),
            counts: slideProgress.counts,
          }
        : undefined,
    [slideProgress, activeEnrollments],
  );

  // Timer auto-advance: the TEACHER client (this one) is the only client that
  // fires the advancing nav at zero — the server never schedules. Fires the
  // next-slide nav when the running timer for the current slide elapses, then
  // clears it.
  const timer = state?.timer ?? null;
  useEffect(() => {
    if (!timer || !timer.autoAdvance || !deck || !currentSlide) return;
    const advance = () => {
      if (Date.now() < timer.endsAt) return;
      if (timer.slideId === currentSlide.id) {
        const nextIndex = slideIndex + 1;
        if (nextIndex < deck.slides.length) {
          sendNav(deck.slides[nextIndex].phase, nextIndex);
        }
      }
      sendTimer(null);
    };
    const remaining = timer.endsAt - Date.now();
    if (remaining <= 0) {
      advance();
      return;
    }
    const id = setTimeout(advance, remaining + 60);
    return () => clearTimeout(id);
  }, [timer, deck, currentSlide, slideIndex, sendNav, sendTimer]);

  if (!state) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10 text-white">
        <p className="text-sm text-white/60">Session not found.</p>
        <Link
          to={TeacherRoutes.plan({ classroomId: cid })}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Link>
      </div>
    );
  }

  const handleEnd = () => {
    sendEnd();
    navigate(TeacherRoutes.report({ classroomId: cid, sessionId: sid }));
  };

  // Full-screen Present mode — the same Preview slide view, driven by the live
  // session (prev/next go through sendNav so students/projector follow).
  if (presenting && deck && currentSlide) {
    return (
      <SessionPresentView
        currentSlide={currentSlide}
        slideIndex={slideIndex}
        slideCount={deck.slides.length}
        dayLabel={snapshot?.label ?? ''}
        onNavigate={(i) => {
          const s = deck.slides[i];
          if (s) sendNav(s.phase, i);
        }}
        onExit={() => setPresenting(false)}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.plan({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-1 text-xs text-emerald-200">
            Live · {countResponses()} response(s)
          </span>
          <RosterPanel
            classroomId={cid}
            currentInteractions={currentInteractions}
            responsesByEnrollment={responsesByEnrollment}
            progressOverride={slideProgress?.perStudent}
            positionByEnrollment={
              state.mode === 'student_paced' ? positions : undefined
            }
            totalSlides={deck?.slides.length}
          />
          {deck && currentSlide && (
            <TimerControl
              slideId={currentSlide.id}
              defaultSec={currentSlide.timerSec ?? 60}
              timer={state.timer}
              onStart={sendTimer}
              onClear={() => sendTimer(null)}
            />
          )}
          {currentSlide &&
            (currentSlide.kind === 'media' ||
              (currentSlide.kind === 'content' && !!currentSlide.media)) && (
              <MediaRemote
                onPlay={() => sendMedia(currentSlide.id, 'play')}
                onPause={() => sendMedia(currentSlide.id, 'pause')}
              />
            )}
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
          {deck && (
            <button
              type="button"
              onClick={() => {
                if (slideIndex < 0 && deck.slides[0]) {
                  sendNav(deck.slides[0].phase, 0);
                }
                setPresenting(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/85"
            >
              <Play className="h-3.5 w-3.5" />
              Present
            </button>
          )}
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

      {deck && snapshot ? (
        <>
          <SlideStrip
            deck={deck}
            snapshot={snapshot}
            currentIndex={slideIndex}
            responseCountFor={(slide) => {
              const ids = slideInteractionIds(slide);
              let count = 0;
              for (const bag of Object.values(responsesByEnrollment)) {
                for (const id of ids) if (bag[id]) count += 1;
              }
              return count;
            }}
            onNavigate={(index, phase) => sendNav(phase, index)}
          />
          {currentSlide && (
            <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10">
              <SlideRenderer
                slide={currentSlide}
                surface="teacher"
                language="both"
                interactions={currentSlideInteractions}
              />
            </div>
          )}
          {currentSlide && currentSlide.kind === 'studio-collab' ? (
            <PairingPanel
              grouping={currentSlide.grouping}
              roster={activeEnrollments}
              pairs={state.pairs}
              onSetPairs={sendPairs}
            />
          ) : currentSlide && currentSlide.kind === 'showcase' ? (
            <ShowcasePanel
              slideId={currentSlide.id}
              offers={aggregateRows
                .filter(
                  (r) =>
                    r.kind === 'showcase' &&
                    currentSlideInteractions.some(
                      (i) => i.id === r.interactionId,
                    ),
                )
                .flatMap((r) => (r.kind === 'showcase' ? r.offers : []))}
              showcase={state.showcase}
              onFeature={sendShowcase}
              onClear={() => sendShowcase(null)}
            />
          ) : currentSlide ? (
            <CurrentSlidePanel
              slide={currentSlide}
              interactions={currentSlideInteractions}
              aggregateRows={aggregateRows.filter((row) =>
                currentSlideInteractions.some(
                  (i) => i.id === row.interactionId,
                ),
              )}
              sharedInteractionIds={state.sharedInteractionIds}
              onToggleShare={(interactionId, on) =>
                sendShare(interactionId, on)
              }
              respondedCount={
                Object.values(responsesByEnrollment).filter((bag) =>
                  currentSlideInteractions.some((i) => bag[i.id]),
                ).length
              }
              rosterCount={Math.max(
                activeEnrollments.length,
                Object.keys(responsesByEnrollment).length,
              )}
              appRouteProgress={appRouteProgress}
            />
          ) : (
            <p className="text-sm text-white/50">
              Use the strip above (or arrow keys) to start the first slide.
            </p>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/40 hover:text-white/70">
              All responses
            </summary>
            <div className="mt-3">
              <InteractionResponseDashboard aggregate={aggregateRows} />
            </div>
          </details>

          <CurriculumCoveragePanel snapshot={snapshot} />
        </>
      ) : (
        <>
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
        </>
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
