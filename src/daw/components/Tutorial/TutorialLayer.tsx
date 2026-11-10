import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClassFollowBar } from './ClassFollowBar';
import { useTutorialClassFollow } from './useTutorialClassFollow';
import { createPortal } from 'react-dom';
import { useInRouterContext } from 'react-router-dom';
import { useStore } from '@/daw/store';
import { openSession } from '@/daw/session/openSession';
import { useDockSidePanels } from '@/daw/shell/dock/dockSidePanels';
import { usePromptBarStore } from '@/daw/shell/prompt/promptBarStore';
import {
  studioTutorialActivityRef,
  useMspModuleCompletion,
} from '@/features/classroom/msp';
import { recordDone } from '@/features/cortex/ledger';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { getTutorial, type Tutorial } from './tutorials';
import { lessonPlace, nextCourseLesson } from './tutorialCatalog';
import { Spotlight } from './Spotlight';
import { CoachCard } from './CoachCard';
import {
  CourseEndCard,
  useBackToCourse,
  type CourseEndCardProps,
} from './CourseEndCard';
import { RainbowHighlight } from './RainbowHighlight';
import {
  idsOf,
  subscribeAnchorRect,
  type AnchorRack,
  type Target,
} from './anchorRegistry';
import { useTutorialDetection } from './useTutorialDetection';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── TutorialLayer ───────────────────────────────────────────────────────────
// Global overlay that drives a running lesson: applies each step's
// preconditions as it arrives, spotlights its target region, detects the
// correct adjustment, celebrates, and auto-advances. Mounted once in DawApp.
// Renders nothing when no tutorial is active. A lesson resumed with its draft
// (milestone 1.15) carries on at its step, over the view the draft kept.
//
// A course lesson ends on its end card instead of closing: "Next: <title>"
// opens the next lesson on a project of its own, as every lesson starts
// from a blank one (owner, 2026-11-09).

// The pulses animate opacity only (the spotlight's is the wider glow over its
// ring) and the rainbow spins with transform, so all run on the compositor.
// None is defined, nor used, under prefers-reduced-motion.
const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  // Over menus, popovers and tooltips (tokens.ts Z), so the spotlight can
  // ring a menu row and the dim covers the rest.
  zIndex: 'var(--daw-z-tutorial)',
  pointerEvents: 'none',
} as const;

const PULSE_KEYFRAMES = `
@keyframes tutorialPulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes tutorialDot {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
@keyframes tutorialRainbowSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes tutorialRainbowFade {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  70%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

export function TutorialLayer() {
  const activeId = useStore((s) => s.activeTutorialId);
  const finishedId = useStore((s) => s.finishedTutorialId);
  const stepIndex = useStore((s) => s.tutorialStepIndex);
  const status = useStore((s) => s.tutorialStepStatus);
  const celebrate = useStore((s) => s.tutorialStepCelebrate);
  const prepared = useStore((s) => s.tutorialStepPrepared);
  const markPrepared = useStore((s) => s.markTutorialStepPrepared);
  const goTo = useStore((s) => s.goToTutorialStep);
  const complete = useStore((s) => s.completeTutorialStep);
  const quit = useStore((s) => s.quitTutorial);
  const finishTutorial = useStore((s) => s.finishTutorial);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const setLibraryOpen = useStore((s) => s.setLibraryOpen);
  const setChannelStripTab = useStore((s) => s.setChannelStripTab);
  const setAutomationParamId = useStore((s) => s.setAutomationParamId);
  const markComplete = useTutorialProgressStore((s) => s.markComplete);
  // Classroom app-route bridge: a lesson a live slide opened reports its
  // completion there, once. Only that lesson: the tab keeps the slide's
  // launch, and any other lesson finished in it reports nothing
  // (practice-tutorial-09).
  const { reportCompletion } = useMspModuleCompletion();

  const tutorial = useMemo(() => getTutorial(activeId), [activeId]);
  const total = tutorial?.steps.length ?? 0;
  const step = tutorial ? (tutorial.steps[stepIndex] ?? null) : null;
  const isLast = tutorial ? stepIndex >= total - 1 : false;
  const isValidated = !!(step?.check || step?.synthCheck || step?.promptCheck);
  // A Group Project lesson the class does together: the teacher's step is
  // the class's step (owner, 2026-11-10).
  const classFollow = useTutorialClassFollow({
    activeId,
    stepIndex,
    total,
    status,
    isLast,
    stepTitle: step?.instruction,
    goTo,
  });
  const holding = classFollow.holding;

  // The rainbow on the region of the step just done (a fresh key replays it),
  // or null once it is done. It keeps that step's target, so it stays put
  // when Next moves the spotlight on. Under reduced motion it holds still.
  const reducedMotion = usePrefersReducedMotion();
  const [rainbow, setRainbow] = useState<{
    key: number;
    target?: Target;
    rack?: AnchorRack;
  } | null>(null);
  const stepTarget = step?.target;
  const stepRack = step?.rack;
  const burst = useCallback(() => {
    setRainbow((r) => ({
      key: (r?.key ?? 0) + 1,
      target: stepTarget,
      rack: stepRack,
    }));
  }, [stepTarget, stepRack]);
  const endBurst = useCallback(() => setRainbow(null), []);
  // A new lesson (or none) never inherits a celebration from the last one.
  useEffect(() => setRainbow(null), [activeId]);

  // Apply the step's preconditions once, as it arrives. Not again when the
  // layer mounts over a step already set up (a return to the editor) or a
  // step resumed with its draft: the student's view since then stays.
  useEffect(() => {
    if (!step || prepared) return;
    // Only the step that is running: StrictMode runs this effect again after
    // a boot has reset the project (resetProjectState), and the old step
    // would put its preconditions on the new project.
    const live = useStore.getState();
    if (
      live.activeTutorialId !== activeId ||
      live.tutorialStepIndex !== stepIndex ||
      live.tutorialStepPrepared
    )
      return;
    const r = step.requires;
    // The step's own view: the Add effect picker or an automation lane left
    // open (by an earlier step, Back, or the student) would cover its target.
    if (!r?.effectsLibrary && live.effectPickerOpen)
      live.cancelEffectsLibrary();
    if (r?.channelStripTab !== undefined && live.automationOpenTrackId !== null)
      live.setAutomationOpenTrackId(null);
    if (r?.view !== undefined) setCurrentView(r.view);
    if (r?.libraryOpen !== undefined) setLibraryOpen(r.libraryOpen);
    if (r?.channelStripTab !== undefined) {
      // A step that opens a track's tab means the track's dock, not Master
      // (else its Effects library would fill the master chain).
      useStore.getState().setDockMaster(false);
      setChannelStripTab(r.channelStripTab);
    }
    if (r?.effectsLibrary) useStore.getState().openEffectsLibrary();
    if (r?.soundsOpen) useDockSidePanels.getState().setFolded('sounds', false);
    if (r?.mixRack) useStore.getState().setMixRack(r.mixRack);
    if (r?.automationParam !== undefined)
      setAutomationParamId(r.automationParam);
    if (r?.promptOpen !== undefined) {
      const bar = usePromptBarStore.getState();
      if (r.promptOpen) bar.expand();
      else bar.collapse();
    }
    if (r?.inspector) useStore.getState().showInspectorPanel(r.inspector);
    if (r?.clearClipSelection) {
      useStore.getState().setSelectedClip(null, null);
    }
    markPrepared();
  }, [
    activeId,
    stepIndex,
    step,
    prepared,
    markPrepared,
    setCurrentView,
    setLibraryOpen,
    setChannelStripTab,
    setAutomationParamId,
  ]);

  // Completion for the slide that opened this lesson, if one did.
  const reportLesson = useCallback(
    (id: string) =>
      reportCompletion(undefined, {
        module: 'studio',
        activityRef: studioTutorialActivityRef(id),
      }),
    [reportCompletion],
  );

  // A step's session-only preconditions don't survive a reload, while the
  // step resumes prepared (the draft keeps the rest of its view): the Mix
  // view's rack opens again for the step that needs it, once as the step
  // mounts (Escape can still shut it after).
  const mixRackNeeded = step?.requires?.mixRack;
  useEffect(() => {
    if (!mixRackNeeded) return;
    const live = useStore.getState();
    if (
      live.tutorialStepPrepared &&
      live.currentView === 'studio' &&
      live.mixRack === null
    ) {
      live.setMixRack(mixRackNeeded);
      if (step?.requires?.effectsLibrary) live.openEffectsLibrary();
    }
    // Once per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, stepIndex]);

  // The lesson is over: it counts as done, and a course lesson shows its end
  // card while any other closes.
  const finishLesson = useCallback(
    (id: string) => {
      markComplete(id);
      recordDone(`tutorial:${id}`);
      reportLesson(id);
      if (lessonPlace(id)) finishTutorial();
      else quit();
    },
    [markComplete, reportLesson, finishTutorial, quit],
  );

  // Detect the correct adjustment for validated steps.
  useTutorialDetection(step, !!tutorial && status === 'waiting', complete);
  useMissingTargetWarning(tutorial?.id, step?.id, step?.target, step?.rack);

  // On completion: celebrate (if earned), then auto-advance / finish.
  useEffect(() => {
    if (!tutorial || status !== 'done') return;
    if (celebrate) burst();
    // With the class: done here waits for the teacher's next step.
    if (holding) return;
    const delay = celebrate ? 950 : 300;
    const id = window.setTimeout(() => {
      if (isLast) finishLesson(tutorial.id);
      else goTo(stepIndex + 1);
    }, delay);
    return () => window.clearTimeout(id);
  }, [
    status,
    celebrate,
    isLast,
    stepIndex,
    tutorial,
    goTo,
    finishLesson,
    burst,
    holding,
  ]);

  if (!tutorial || !step) {
    const place = lessonPlace(finishedId);
    const lesson = place ? getTutorial(finishedId) : null;
    if (!place || !lesson) return null;
    return createPortal(
      <div data-tutorial-layer="" style={OVERLAY_STYLE}>
        <FinishedLesson
          course={place.course}
          lesson={lesson}
          number={place.number}
          total={place.total}
          next={nextCourseLesson(lesson.id)}
        />
      </div>,
      document.body,
    );
  }

  const finishNow = () => finishLesson(tutorial.id);
  const onBack = () => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  };
  const onNext = () => {
    // Validated steps advance via detection; Next is only enabled once done.
    if (isValidated && status !== 'done') return;
    if (!isValidated) burst(); // free-form: celebrate on Next
    if (holding) {
      // At the class's step: tell the teacher, then wait for them.
      classFollow.holdAtClassStep();
      return;
    }
    if (isLast) finishNow();
    else goTo(stepIndex + 1);
  };

  return createPortal(
    <div
      // A modal under a lesson (the Add effect picker) lets the coach card
      // take clicks and focus without closing (DawDialog).
      data-tutorial-layer=""
      style={OVERLAY_STYLE}
    >
      {!reducedMotion && <style>{PULSE_KEYFRAMES}</style>}
      <Spotlight target={step.target} rack={step.rack} />
      {rainbow && (
        <RainbowHighlight
          key={rainbow.key}
          target={rainbow.target}
          rack={rainbow.rack}
          reducedMotion={reducedMotion}
          onDone={endBurst}
        />
      )}
      {classFollow.following && (
        <ClassFollowBar
          leading={classFollow.leading}
          step={
            classFollow.leading
              ? stepIndex
              : (classFollow.classStep ?? stepIndex)
          }
          total={total}
          waiting={classFollow.waiting}
          doneCount={classFollow.doneCount}
        />
      )}
      <CoachCard
        title={tutorial.title}
        stage={step.stage}
        instruction={step.instruction}
        why={step.why}
        hint={step.hint}
        target={step.target}
        rack={step.rack}
        stepIndex={stepIndex}
        total={total}
        status={status}
        isValidated={isValidated}
        isLast={isLast}
        onBack={onBack}
        onNext={onNext}
        onQuit={quit}
      />
    </div>,
    document.body,
  );
}

/**
 * In development, says which step's highlight has nothing to ring: a target
 * still missing a moment after the step arrives (an id no control carries,
 * or one in a panel the step doesn't open). The student sees the card with
 * no ring, so this is the only trace of it.
 */
function useMissingTargetWarning(
  lessonId: string | undefined,
  stepId: string | undefined,
  target: Target | undefined,
  rack: AnchorRack | undefined,
) {
  const key = idsOf(target).join('|');
  useEffect(() => {
    if (!import.meta.env.DEV || !lessonId || !stepId || !key) return;
    let found = false;
    const unsubscribe = subscribeAnchorRect(
      target,
      (rect) => {
        if (rect) found = true;
      },
      { rack },
    );
    const timer = window.setTimeout(() => {
      if (!found) {
        console.warn(
          `[studio lesson] ${lessonId} › ${stepId}: nothing on screen to highlight (${key}).`,
        );
      }
    }, 1500);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
    // `key` is the value-stable form of `target`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, stepId, key, rack]);
}

type EndCardProps = Omit<
  CourseEndCardProps,
  'lesson' | 'onNext' | 'onBackToCourse' | 'onDone'
> & { lesson: Tutorial };

/** The end card of a course lesson, with the way on. */
function FinishedLesson(props: EndCardProps) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <RoutedEndCard {...props} />
  ) : (
    <EndCard {...props} onBackToCourse={null} />
  );
}

function RoutedEndCard(props: EndCardProps) {
  const backToCourse = useBackToCourse();
  return <EndCard {...props} onBackToCourse={backToCourse} />;
}

function EndCard({
  onBackToCourse,
  ...props
}: EndCardProps & { onBackToCourse: (() => void) | null }) {
  const dismiss = useStore((s) => s.dismissFinishedTutorial);
  const { next } = props;
  return (
    <CourseEndCard
      {...props}
      // The next lesson on a new project, as every lesson starts; the song
      // just made is kept, with a Restore (openSession).
      onNext={() => {
        dismiss();
        if (next) {
          void openSession(
            { kind: 'tutorial', tutorialId: next.id },
            { source: 'panel' },
          );
        }
      }}
      onBackToCourse={() => {
        dismiss();
        onBackToCourse?.();
      }}
      onDone={dismiss}
    />
  );
}
