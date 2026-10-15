import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/daw/store';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import {
  studioTutorialActivityRef,
  useMspModuleCompletion,
} from '@/features/classroom/msp';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { getTutorial } from './tutorials';
import { Spotlight } from './Spotlight';
import { CoachCard } from './CoachCard';
import { Confetti } from './Confetti';
import { useTutorialDetection } from './useTutorialDetection';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── TutorialLayer ───────────────────────────────────────────────────────────
// Global overlay that drives a running lesson: applies each step's
// preconditions as it arrives, spotlights its target region, detects the
// correct adjustment, celebrates, and auto-advances. Mounted once in DawApp.
// Renders nothing when no tutorial is active. A lesson resumed with its draft
// (milestone 1.15) carries on at its step, over the view the draft kept.

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

export function TutorialLayer() {
  const activeId = useStore((s) => s.activeTutorialId);
  const stepIndex = useStore((s) => s.tutorialStepIndex);
  const status = useStore((s) => s.tutorialStepStatus);
  const celebrate = useStore((s) => s.tutorialStepCelebrate);
  const prepared = useStore((s) => s.tutorialStepPrepared);
  const markPrepared = useStore((s) => s.markTutorialStepPrepared);
  const goTo = useStore((s) => s.goToTutorialStep);
  const complete = useStore((s) => s.completeTutorialStep);
  const quit = useStore((s) => s.quitTutorial);
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
  // The overlay portals to <body>, outside .daw-root. It holds the DAW tokens
  // there itself (daw.css aliases them onto body.daw-active), so the coach
  // card resolves them from its first frame without anything copied onto the
  // portal, and never depends on someone else having set the class.
  useDawBodyTokens();

  const tutorial = useMemo(() => getTutorial(activeId), [activeId]);
  const total = tutorial?.steps.length ?? 0;
  const step = tutorial ? (tutorial.steps[stepIndex] ?? null) : null;
  const isLast = tutorial ? stepIndex >= total - 1 : false;
  const isValidated = !!(step?.check || step?.synthCheck);

  // The burst on screen (a fresh key replays it), or null once it is done:
  // the full-screen canvas is unmounted between bursts, and skipped under
  // reduced motion.
  const reducedMotion = usePrefersReducedMotion();
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const burst = useCallback(() => {
    if (!reducedMotion) setConfettiKey((k) => (k ?? 0) + 1);
  }, [reducedMotion]);
  const endBurst = useCallback(() => setConfettiKey(null), []);
  // A new lesson (or none) never inherits a burst from the last one.
  useEffect(() => setConfettiKey(null), [activeId]);

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
    if (r?.view !== undefined) setCurrentView(r.view);
    if (r?.libraryOpen !== undefined) setLibraryOpen(r.libraryOpen);
    if (r?.channelStripTab !== undefined) setChannelStripTab(r.channelStripTab);
    if (r?.automationParam !== undefined)
      setAutomationParamId(r.automationParam);
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

  // Detect the correct adjustment for validated steps.
  useTutorialDetection(step, !!tutorial && status === 'waiting', complete);

  // On completion: celebrate (if earned), then auto-advance / finish.
  useEffect(() => {
    if (!tutorial || status !== 'done') return;
    if (celebrate) burst();
    const delay = celebrate ? 950 : 300;
    const id = window.setTimeout(() => {
      if (isLast) {
        markComplete(tutorial.id);
        reportLesson(tutorial.id);
        quit();
      } else {
        goTo(stepIndex + 1);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [
    status,
    celebrate,
    isLast,
    stepIndex,
    tutorial,
    goTo,
    quit,
    markComplete,
    reportLesson,
    burst,
  ]);

  if (!tutorial || !step) return null;

  const finishNow = () => {
    markComplete(tutorial.id);
    reportLesson(tutorial.id);
    quit();
  };
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

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      {!reducedMotion && <style>{PULSE_KEYFRAMES}</style>}
      <Spotlight target={step.target} rack={step.rack} />
      {confettiKey !== null && <Confetti key={confettiKey} onDone={endBurst} />}
      <CoachCard
        title={tutorial.title}
        stage={step.stage}
        instruction={step.instruction}
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
