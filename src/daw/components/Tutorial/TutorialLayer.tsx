import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInRouterContext } from 'react-router-dom';
import { useStore } from '@/daw/store';
import {
  studioTutorialActivityRef,
  useMspModuleCompletion,
} from '@/features/classroom/msp';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { getTutorial } from './tutorials';
import { lessonPlace, nextCourseLesson } from './tutorialCatalog';
import { Spotlight } from './Spotlight';
import { CoachCard } from './CoachCard';
import { Confetti } from './Confetti';
import {
  CourseEndCard,
  useBackToCourse,
  type CourseEndCardProps,
} from './CourseEndCard';
import { DemoBlocker, DemoStage } from './demo/DemoStage';
import { useStepDemo } from './demo/useStepDemo';
import { useTutorialDetection } from './useTutorialDetection';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── TutorialLayer ───────────────────────────────────────────────────────────
// Global overlay that drives a running lesson: applies each step's
// preconditions as it arrives, spotlights its target region, detects the
// correct adjustment, celebrates, and auto-advances. Mounted once in DawApp.
// Renders nothing when no tutorial is active. A lesson resumed with its draft
// (milestone 1.15) carries on at its step, over the view the draft kept.
//
// A step with a demo plays it first (the 'watch' phase): the cursor does the
// move on the real Studio while a blocker keeps the student's clicks off it,
// and the spotlight frames each beat. The step's check is armed only on the
// student's turn, so the demo's own moves never pass it. A resumed step is
// the student's turn at once, with "Show me again" a click away.
//
// A course lesson (Studio Basics) ends on its end card instead of closing:
// "Next: <title>" runs the next lesson on the same project.

// Both pulses animate opacity only (the spotlight's is the wider glow over
// its ring), so they run on the compositor. Neither is defined, nor used,
// under prefers-reduced-motion.
const PULSE_KEYFRAMES = `
@keyframes tutorialPulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes tutorialDot {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
`;

/** Room the coach card leaves around a demo's target for its callout. */
const DEMO_CALLOUT_ROOM = 72;

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  pointerEvents: 'none',
} as const;

export function TutorialLayer() {
  const activeId = useStore((s) => s.activeTutorialId);
  const finishedId = useStore((s) => s.finishedTutorialId);
  const stepIndex = useStore((s) => s.tutorialStepIndex);
  const status = useStore((s) => s.tutorialStepStatus);
  const celebrate = useStore((s) => s.tutorialStepCelebrate);
  const prepared = useStore((s) => s.tutorialStepPrepared);
  const demoPhase = useStore((s) => s.tutorialDemoPhase);
  const markPrepared = useStore((s) => s.markTutorialStepPrepared);
  const goTo = useStore((s) => s.goToTutorialStep);
  const complete = useStore((s) => s.completeTutorialStep);
  const quit = useStore((s) => s.quitTutorial);
  const finishTutorial = useStore((s) => s.finishTutorial);
  const beginDemo = useStore((s) => s.beginTutorialDemo);
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
  const isValidated = !!(step?.check || step?.synthCheck);
  const hasDemo = !!step?.demo && step.demo.length > 0;
  const watching = !!step && demoPhase === 'watch';

  // The burst on screen (a fresh key replays it), or null once it is done:
  // the full-screen canvas is unmounted between bursts, and skipped under
  // reduced motion.
  const reducedMotion = usePrefersReducedMotion();
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const burst = useCallback(() => {
    if (!reducedMotion) setConfettiKey((k) => (k ?? 0) + 1);
  }, [reducedMotion]);
  const endBurst = useCallback(() => setConfettiKey(null), []);
  // A new lesson never inherits a burst from the last one. A course lesson
  // that just finished keeps its burst over its end card.
  useEffect(() => {
    if (activeId !== null) setConfettiKey(null);
  }, [activeId]);

  // Apply the step's preconditions once, as it arrives, then start its demo
  // if it has one. Not again when the layer mounts over a step already set
  // up (a return to the editor) or a step resumed with its draft: the
  // student's view since then stays.
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
    if (r?.view !== undefined) setCurrentView(r.view);
    if (r?.libraryOpen !== undefined) setLibraryOpen(r.libraryOpen);
    if (r?.channelStripTab !== undefined) setChannelStripTab(r.channelStripTab);
    if (r?.automationParam !== undefined)
      setAutomationParamId(r.automationParam);
    if (r?.clearClipSelection) {
      useStore.getState().setSelectedClip(null, null);
    }
    if (step.demo && step.demo.length > 0) beginDemo();
    markPrepared();
  }, [
    activeId,
    stepIndex,
    step,
    prepared,
    markPrepared,
    beginDemo,
    setCurrentView,
    setLibraryOpen,
    setChannelStripTab,
    setAutomationParamId,
  ]);

  // The step's demo, while it is the 'watch' phase.
  const demo = useStepDemo(step, watching, reducedMotion);

  // Completion for the slide that opened this lesson, if one did.
  const reportLesson = useCallback(
    (id: string) =>
      reportCompletion(undefined, {
        module: 'studio',
        activityRef: studioTutorialActivityRef(id),
      }),
    [reportCompletion],
  );

  // The lesson is over: it counts as done, and a course lesson shows its end
  // card while any other closes.
  const finishLesson = useCallback(
    (id: string) => {
      markComplete(id);
      reportLesson(id);
      if (lessonPlace(id)) finishTutorial();
      else quit();
    },
    [markComplete, reportLesson, finishTutorial, quit],
  );

  // Detect the correct adjustment for validated steps, once it is the
  // student's turn: the step set up, and its demo (if any) over. `armed` is
  // the Studio at that moment.
  useTutorialDetection(
    step,
    !!tutorial && status === 'waiting' && prepared && demoPhase === 'turn',
    complete,
  );

  // On completion: celebrate (if earned), then auto-advance / finish.
  useEffect(() => {
    if (!tutorial || status !== 'done') return;
    if (celebrate) burst();
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
  ]);

  const confetti = confettiKey !== null && (
    <Confetti key={confettiKey} onDone={endBurst} />
  );

  if (!tutorial || !step) {
    const place = lessonPlace(finishedId);
    const lesson = place ? getTutorial(finishedId) : null;
    if (!place || !lesson) return null;
    return createPortal(
      <div style={overlayStyle}>
        {confetti}
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
    if (isLast) finishNow();
    else goTo(stepIndex + 1);
  };
  const place = lessonPlace(tutorial.id);
  // While the demo plays, the spotlight and the card follow its beats.
  const spot = watching ? demo.spot : { target: step.target, rack: step.rack };

  return createPortal(
    <div style={overlayStyle}>
      {!reducedMotion && <style>{PULSE_KEYFRAMES}</style>}
      <Spotlight target={spot?.target} rack={spot?.rack} />
      {watching && <DemoBlocker />}
      {confetti}
      <CoachCard
        title={tutorial.title}
        stage={step.stage}
        instruction={step.instruction}
        hint={step.hint}
        target={watching ? (spot?.target ?? step.target) : step.target}
        rack={watching ? (spot?.rack ?? step.rack) : step.rack}
        stepIndex={stepIndex}
        total={total}
        status={status}
        isValidated={isValidated}
        isLast={isLast}
        onBack={onBack}
        onNext={onNext}
        onQuit={quit}
        demo={
          hasDemo
            ? {
                phase: demoPhase,
                caption: demo.caption,
                onSkip: demo.skip,
                onReplay: beginDemo,
              }
            : undefined
        }
        lessonPlace={
          place ? `Lesson ${place.number} of ${place.total}` : undefined
        }
        clearance={watching ? DEMO_CALLOUT_ROOM : 0}
      />
      {watching && (
        <DemoStage frame={demo.frame} reducedMotion={reducedMotion} />
      )}
    </div>,
    document.body,
  );
}

/** The end card of a course lesson, with the way on. */
function FinishedLesson(
  props: Omit<CourseEndCardProps, 'onNext' | 'onBackToCourse' | 'onDone'>,
) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <RoutedEndCard {...props} />
  ) : (
    <EndCard {...props} onBackToCourse={null} />
  );
}

function RoutedEndCard(
  props: Omit<CourseEndCardProps, 'onNext' | 'onBackToCourse' | 'onDone'>,
) {
  const backToCourse = useBackToCourse();
  return <EndCard {...props} onBackToCourse={backToCourse} />;
}

function EndCard({
  onBackToCourse,
  ...props
}: Omit<CourseEndCardProps, 'onNext' | 'onBackToCourse' | 'onDone'> & {
  onBackToCourse: (() => void) | null;
}) {
  const startTutorial = useStore((s) => s.startTutorial);
  const dismiss = useStore((s) => s.dismissFinishedTutorial);
  const { next } = props;
  return (
    <CourseEndCard
      {...props}
      // The next lesson on this project, from where the student is.
      onNext={() => (next ? startTutorial(next.id) : dismiss())}
      onBackToCourse={() => {
        dismiss();
        onBackToCourse?.();
      }}
      onDone={dismiss}
    />
  );
}
