import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Lock,
  MonitorUp,
  Play,
  Share2,
  StopCircle,
  Unlock,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { PILL_ZONE } from '@/daw/ui/Pill';
import { Segmented } from '@/daw/ui/Segmented';
import {
  OfficeRailSlot,
  OfficeTopActions,
} from '@/features/office/frame/railSlot';
import { StatusPill } from '@/features/office/ui/StatusPill';
import { useClassroom } from '@/hooks/data';
import { InteractionResponseDashboard } from '../assignments/InteractionResponseDashboard';
import { useEnrollments } from '../enrollments';
import { useFollowOutbox } from '../follow/classFollow';
import { useMspInboxEntries } from '../msp';
import { PHASES } from '../phases';
import { SnapshotRepairBadge } from '../publish/SnapshotRepairBadge';
import { usePublishedDays } from '../publish/usePublishedDays';
import { useSanitizedPublishedDay } from '../publish/useRuleOneReadGuard';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import { SlideRenderer } from '../slides/SlideRenderer';
import {
  deckFromSnapshot,
  interactionsForSlide,
  slideAt,
  slideInteractionIds,
} from '../slides/deck';
import {
  isProjectionRefused,
  projectionRefusedReason,
} from '../slides/interactionPolicy';
import { resolveElements } from '../slides/migrateDeckV1';
import { revealContentHeight } from '../slides/slideGrid';
import { ParticipationPulse } from '../slides/viz/ParticipationPulse';
import type { Interaction } from '../types';
import { ConnectionBadge } from './ConnectionBadge';
import { CurriculumCoveragePanel } from './CurriculumCoveragePanel';
import { PhaseNavigator } from './PhaseNavigator';
import { RosterPanel } from './RosterPanel';
import { SessionPresentView } from './SessionPresentView';
import { buildSlideProgress, submittedMindMap } from './buildSlideProgress';
import type { SessionMode } from './sessionsStore';
import { ClassStepPanel } from './slides/ClassStepPanel';
import { CurrentSlidePanel } from './slides/CurrentSlidePanel';
import { MediaRemote } from './slides/MediaRemote';
import { PairingPanel } from './slides/PairingPanel';
import { ShowcasePanel } from './slides/ShowcasePanel';
import { ShowcaseProjectorFrame } from './slides/ShowcaseProjectorFrame';
import { SlideStrip } from './slides/SlideStrip';
import { TimerControl } from './slides/TimerControl';
import { buildRevealNode } from './slides/revealNode';
import { useActivityOutline } from './useActivityOutline';
import { useLiveResponses } from './useLiveResponses';
import { useSessionActivityDone } from './useSessionActivityDone';
import { useSessionPositions } from './useSessionPositions';
import { useSessionPresence } from './useSessionPresence';
import { useSessionSync } from './useSessionSync';

// Echo (class): the teacher's strip and live grid. Its engine and screens
// load only when an Echo slide is the current one.
const EchoTeacherPanel = lazy(() =>
  import('../echo/EchoTeacherPanel').then(({ EchoTeacherPanel }) => ({
    default: EchoTeacherPanel,
  })),
);

export const TeacherSessionDashboard = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  // The class's one language for the slides (owner, 2026-11-10).
  const classLanguage = useTeacherConfig(cid).config.language;
  const sid = sessionId ?? '';
  const navigate = useNavigate();

  const {
    state,
    connectionStatus,
    sendNav,
    sendLock,
    sendShare,
    sendMode,
    sendEnd,
    sendPairs,
    sendShowcase,
    sendTimer,
    sendMedia,
    sendEcho,
    sendActivity,
    clock,
  } = useSessionSync(sid, 'teacher', cid);
  const activityDone = useSessionActivityDone(sid);
  const { aggregate, countResponses, responsesByEnrollment } =
    useLiveResponses(sid);
  const positions = useSessionPositions(sid);
  const presence = useSessionPresence(sid);
  const { getPublishedDay } = usePublishedDays(cid);
  const { getEnrollment, active: activeEnrollments } = useEnrollments(cid);
  const { data: classroom } = useClassroom(cid);

  const [presenting, setPresenting] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const storedPublishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;
  // Rule 1, read path: strip rather than blank, and tell the teacher — this is
  // the one surface where the person who can re-publish the lesson is looking.
  const { day: publishedDay, stripped: repairedPaths } =
    useSanitizedPublishedDay(storedPublishedDay, 'teacher-dashboard', cid);

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

  // A Group Project the class does together: its activity, and the class's
  // step in it (owner, 2026-11-10).
  const followInteraction =
    currentSlide?.kind === 'app-route'
      ? currentSlideInteractions.find((i) => i.atlas?.follow)
      : undefined;
  const followRef = followInteraction?.atlas?.activityRef;
  const classActivity =
    currentSlide && state?.activity?.slideId === currentSlide.id
      ? state.activity
      : undefined;
  // The activity's steps, so every screen can say "Step 3 of 14 · …".
  const outline = useActivityOutline(followRef);
  const stepFields = (step: number) =>
    outline
      ? {
          total: outline.total,
          ...(outline.titles[step] ? { title: outline.titles[step] } : {}),
        }
      : classActivity?.total !== undefined
        ? { total: classActivity.total }
        : {};
  // Arriving on the slide starts the class on step 1, once per arrival
  // (until the socket echoes it back, the state still names the old slide).
  const startedFor = useRef<string | null>(null);
  const activitySlideId = state?.activity?.slideId;
  const live = Boolean(state) && state?.status !== 'ended';
  useEffect(() => {
    if (!currentSlide || !followRef || !live) {
      startedFor.current = null;
      return;
    }
    if (activitySlideId === currentSlide.id) return;
    if (startedFor.current === currentSlide.id) return;
    startedFor.current = currentSlide.id;
    sendActivity({
      slideId: currentSlide.id,
      ref: followRef,
      step: 0,
      ...(outline
        ? { total: outline.total, title: outline.titles[0] ?? '' }
        : {}),
    });
    // `outline` arriving later re-sends nothing: the next step carries it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, followRef, live, activitySlideId, sendActivity]);
  // The outline arrived after the class started: fill in the count and the
  // step's name once, so the room sees "Step 1 of 14 · …".
  useEffect(() => {
    if (!outline || !classActivity || classActivity.total !== undefined) return;
    sendActivity({
      ...classActivity,
      total: outline.total,
      ...(outline.titles[classActivity.step]
        ? { title: outline.titles[classActivity.step] }
        : {}),
    });
  }, [outline, classActivity, sendActivity]);
  // The teacher, leading from inside the activity's own tab.
  useFollowOutbox(sid, (note) => {
    if (note.kind !== 'step' || !currentSlide || note.ref !== followRef) return;
    sendActivity({
      slideId: currentSlide.id,
      ref: note.ref,
      step: note.step,
      ...(note.total !== undefined ? { total: note.total } : {}),
      ...(note.title ? { title: note.title } : {}),
    });
  });

  // Echo (class): the slide's echo interaction, and the class to show in its grid.
  const echoInteraction = currentSlideInteractions.find(
    (i) => i.type === 'echo',
  );
  const echoRoster = useMemo(
    () =>
      activeEnrollments.map((e) => ({
        enrollmentId: e.id,
        displayName: e.displayName,
      })),
    [activeEnrollments],
  );
  const echoPanel =
    echoInteraction && currentSlide && state ? (
      <Suspense
        fallback={<p className="text-sm text-white/50">Loading Echo…</p>}
      >
        <EchoTeacherPanel
          sessionId={sid}
          classroomId={cid}
          slideId={currentSlide.id}
          interaction={echoInteraction}
          echo={state.echo}
          responses={responsesByEnrollment}
          roster={echoRoster}
          presence={presence}
          clock={clock}
          sendEcho={sendEcho}
        />
      </Suspense>
    ) : null;

  /**
   * Everything Present injects — not just the reveal.
   *
   * Present used to receive ONE slot while the projector received four, so in a
   * single-projector room the teacher featured a student's project and the
   * class saw "Waiting for the teacher to feature a project…" for the rest of
   * the lesson. Present IS the projected surface there; the slot sets have to
   * match or the two screens disagree about what the class is looking at.
   *
   * `showcaseFrame` is the deliberate, teacher-approved share from
   * `state.showcase` — never the raw offer stream, which `buildProjectorView`
   * refuses at any depth.
   */
  /**
   * The reveal SLOT Present injects.
   *
   * Built with the SAME anonymized gating as the projector (`buildRevealNode`),
   * because in a single-screen classroom Present is what the class is looking
   * at. Showing the teacher's identified view there would project every
   * student's name onto the wall.
   *
   * It is a slot, not a prebuilt node: `SlideRenderer` decides which
   * interactions may reveal on a projected surface (`interactionPolicy`), so
   * this is never even CALLED for a check-in. It used to hand over the first
   * shared interaction's node regardless of type, which put the gating in the
   * caller — the copy most likely to drift from the projector's.
   */
  const presentRevealSlot = useMemo(() => {
    if (!state || !currentSlide) return undefined;
    const availableHeight = revealContentHeight(resolveElements(currentSlide));
    return (interaction: Interaction) =>
      buildRevealNode({
        interaction,
        responsesByEnrollment,
        sessionId: sid,
        sharedInteractionIds: state.sharedInteractionIds,
        updatedAt: state.updatedAt,
        revealHint:
          currentSlide.kind === 'interaction' ? currentSlide.reveal : undefined,
        availableHeight,
      });
  }, [state, currentSlide, responsesByEnrollment, sid]);

  /** Response COUNTS only — never a payload (the chip is a pulse, not data). */
  const countFor = useMemo(() => {
    return (interactionId: string): number => {
      let count = 0;
      for (const bag of Object.values(responsesByEnrollment)) {
        if (bag[interactionId]) count += 1;
      }
      return count;
    };
  }, [responsesByEnrollment]);

  const presentSlots = useMemo(() => {
    if (!currentSlide) return undefined;
    const firstId = currentSlideInteractions[0]?.id;
    return {
      // The Group Practice slide's Studio leads the class from Present.
      studioFollow: {
        sessionId: sid,
        lead: true,
        step:
          state?.activity?.slideId === currentSlide.id
            ? state.activity.step
            : undefined,
      },
      ...(presentRevealSlot ? { reveal: presentRevealSlot } : {}),
      ...(firstId
        ? {
            statusChip: (
              <ParticipationPulse
                responded={countFor(firstId)}
                language="both"
              />
            ),
          }
        : {}),
      ...(currentSlide.kind === 'showcase' && state?.showcase
        ? {
            showcaseFrame: <ShowcaseProjectorFrame showcase={state.showcase} />,
          }
        : {}),
    };
  }, [
    currentSlide,
    currentSlideInteractions,
    presentRevealSlot,
    state?.showcase,
    state?.activity,
    sid,
    countFor,
  ]);

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
  const appRouteProgress = useMemo(() => {
    if (!slideProgress) return undefined;
    // A Promoter slide: each student's submitted mind map, to open.
    const mapInteraction = currentSlideInteractions.find((i) => i.atlas?.board);
    return {
      rows: activeEnrollments.map((e) => {
        const mindMap = mapInteraction
          ? submittedMindMap(
              responsesByEnrollment[e.id],
              mspInboxEntries,
              mapInteraction.id,
              e.id,
            )
          : undefined;
        return {
          enrollmentId: e.id,
          displayName: e.displayName,
          state: slideProgress.perStudent[e.id] ?? 'not_started',
          ...(mindMap ? { mindMap } : {}),
        };
      }),
      counts: slideProgress.counts,
    };
  }, [
    slideProgress,
    activeEnrollments,
    currentSlideInteractions,
    responsesByEnrollment,
    mspInboxEntries,
  ]);

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

  // End confirms first (ending drops the whole class out of the live view).
  const confirmEnd = () => {
    setConfirmingEnd(false);
    sendEnd(); // ends the local mirror immediately; server sync + toast run in bg
    navigate(TeacherRoutes.report({ classroomId: cid, sessionId: sid }));
  };
  const endDialog = confirmingEnd ? (
    <EndSessionConfirm
      onConfirm={confirmEnd}
      onCancel={() => setConfirmingEnd(false)}
    />
  ) : null;

  // Full-screen Present mode — the same Preview slide view, driven by the live
  // session (prev/next go through sendNav so students/projector follow).
  if (presenting && deck && currentSlide) {
    return (
      <>
        <SessionPresentView
          classroomId={cid}
          currentSlide={currentSlide}
          interactions={currentSlideInteractions}
          slideIndex={slideIndex}
          slideCount={deck.slides.length}
          onNavigate={(i) => {
            const s = deck.slides[i];
            if (s) sendNav(s.phase, i);
          }}
          onExit={() => setPresenting(false)}
          slots={presentSlots}
        />
        {/* Echo's rounds run from this computer: they go on while presenting. */}
        {echoPanel && <div className="hidden">{echoPanel}</div>}
        {endDialog}
      </>
    );
  }

  const joinCode = classroom?.code;
  const startPresenting = () => {
    if (slideIndex < 0 && deck?.slides[0]) sendNav(deck.slides[0].phase, 0);
    setPresenting(true);
  };
  const step = (delta: -1 | 1) => {
    if (!deck) return;
    const next = Math.min(
      deck.slides.length - 1,
      Math.max(0, slideIndex + delta),
    );
    const target = deck.slides[next];
    if (target && next !== slideIndex) sendNav(target.phase, next);
  };

  // The control room (owner, 2026-11-09), Pear Deck's teacher dashboard in
  // the Office frame: Present and End on the top rail, the join code and the
  // room's controls in one bar, the slides, then the current slide beside
  // what the class is answering; the bottom rail steps through the deck.
  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 text-white md:px-6">
      <OfficeTopActions>
        {/* NO SILENT MOCKS: says plainly whether students can actually join. */}
        <ConnectionBadge status={connectionStatus} size="sm" />
        {deck && (
          <Button variant="primary" size="pill" onClick={startPresenting}>
            <Play aria-hidden />
            <span className="max-sm:sr-only">Present</span>
          </Button>
        )}
        <Button
          variant="danger"
          size="pill"
          onClick={() => setConfirmingEnd(true)}
        >
          <StopCircle aria-hidden />
          <span className="max-sm:sr-only">End</span>
        </Button>
      </OfficeTopActions>

      {deck && deck.slides.length > 0 && (
        <OfficeRailSlot>
          <div className={`${PILL_ZONE} gap-1`}>
            <IconButton
              label="Previous slide"
              icon={<ChevronLeft />}
              disabled={slideIndex <= 0}
              onClick={() => step(-1)}
            />
            <span className="min-w-[6.5rem] text-center text-[0.8125rem] tabular-nums text-daw-text-2">
              {slideIndex < 0
                ? 'Not started'
                : `Slide ${slideIndex + 1} of ${deck.slides.length}`}
            </span>
            <IconButton
              label="Next slide"
              icon={<ChevronRight />}
              disabled={slideIndex >= deck.slides.length - 1}
              onClick={() => step(1)}
            />
          </div>
        </OfficeRailSlot>
      )}

      <section
        aria-label="Session controls"
        className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] p-2"
      >
        {joinCode && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(joinCode)
                .then(() => toast.success(`Copied join code ${joinCode}`))
                .catch(() => toast.error('Could not copy the code'));
            }}
            title="Students join the class with this code; enrolled students see the live session on their Classroom page."
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-[0.8125rem] text-daw-text hover:bg-white/[0.1]"
          >
            <span className="text-daw-text-3">Join code</span>
            <span className="font-bold tracking-[0.12em]">{joinCode}</span>
            <Copy aria-hidden className="size-3.5 text-daw-text-3" />
          </button>
        )}
        {/* Session LIFECYCLE, not transport. "Live" and the green only appear
            on a real server session; a practice session says Practice. */}
        <StatusPill
          tone={connectionStatus === 'practice' ? 'neutral' : 'success'}
        >
          {connectionStatus === 'practice' ? 'Practice' : 'Live'} ·{' '}
          {countResponses()} {countResponses() === 1 ? 'response' : 'responses'}
        </StatusPill>
        <SnapshotRepairBadge stripped={repairedPaths} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <RosterPanel
            classroomId={cid}
            currentInteractions={currentInteractions}
            responsesByEnrollment={responsesByEnrollment}
            progressOverride={slideProgress?.perStudent}
            positionByEnrollment={
              state.mode === 'student_paced' ? positions : undefined
            }
            totalSlides={deck?.slides.length}
            presenceByEnrollment={presence}
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
          <Segmented<SessionMode>
            label="Pacing"
            options={[
              { value: 'teacher_paced', label: 'You lead' },
              { value: 'student_paced', label: 'Own pace' },
            ]}
            value={state.mode}
            onValueChange={sendMode}
          />
          <Button
            size="lg"
            variant={state.locked ? 'primary' : 'secondary'}
            aria-pressed={state.locked}
            onClick={() => sendLock(!state.locked)}
          >
            {state.locked ? <Lock aria-hidden /> : <Unlock aria-hidden />}
            {state.locked ? 'Screens locked' : 'Lock screens'}
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a
              href={TeacherRoutes.projector({
                classroomId: cid,
                sessionId: sid,
              })}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the class screen in a new window for the projector"
            >
              <MonitorUp aria-hidden />
              Projector
            </a>
          </Button>
        </div>
      </section>

      {endDialog}

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
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {currentSlide ? (
              <div className="aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] border border-white/10">
                <SlideRenderer
                  slide={currentSlide}
                  surface="teacher"
                  language={classLanguage}
                  interactions={currentSlideInteractions}
                />
              </div>
            ) : (
              <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-white/15 text-center">
                <p className="text-[0.9375rem] text-daw-text-2">
                  The class is waiting on the first slide.
                </p>
                <Button variant="primary" size="lg" onClick={() => step(1)}>
                  Start the lesson
                </Button>
              </div>
            )}
            <section
              aria-label="What the class is doing"
              className="flex min-w-0 flex-col gap-3"
            >
              {echoPanel ? (
                echoPanel
              ) : currentSlide && currentSlide.kind === 'studio-collab' ? (
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
              ) : currentSlide && followInteraction ? (
                <ClassStepPanel
                  sessionId={sid}
                  slideId={currentSlide.id}
                  interaction={followInteraction}
                  activity={classActivity}
                  done={activityDone}
                  rosterCount={Math.max(activeEnrollments.length, 0)}
                  onStep={(step) =>
                    followRef &&
                    sendActivity({
                      slideId: currentSlide.id,
                      ref: followRef,
                      step,
                      ...stepFields(step),
                    })
                  }
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
                <p className="text-[0.875rem] text-daw-text-3">
                  Pick a slide in the strip, or use the arrows on the bottom
                  rail, to start.
                </p>
              )}
            </section>
          </div>
          <details className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <summary className="cursor-pointer text-[0.8125rem] font-medium text-daw-text-2 hover:text-daw-text">
              Every response so far
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
  const canShare = !isProjectionRefused(interaction);
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
            : (projectionRefusedReason(interaction) ?? undefined)
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

interface EndSessionConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirm before ending — ending drops the whole class out of the live view. */
const EndSessionConfirm = ({ onConfirm, onCancel }: EndSessionConfirmProps) => (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
    onClick={onCancel}
  >
    <div
      className="flex max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-medium">End the session for the class?</h3>
      <p className="text-sm text-white/70">
        Every student will drop out of the live view and their devices will stop
        following along. You’ll be taken to the session report.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <StopCircle className="h-4 w-4" />
          End session
        </button>
      </div>
    </div>
  </div>
);
