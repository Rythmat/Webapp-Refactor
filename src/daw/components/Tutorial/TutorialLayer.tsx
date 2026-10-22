import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/daw/store';
import { useDockSidePanels } from '@/daw/shell/dock/dockSidePanels';
import {
  studioTutorialActivityRef,
  useMspModuleCompletion,
} from '@/features/classroom/msp';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { getTutorial } from './tutorials';
import { Spotlight } from './Spotlight';
import { CoachCard } from './CoachCard';
import { RainbowHighlight } from './RainbowHighlight';
import type { AnchorRack, Target } from './anchorRegistry';
import { useTutorialDetection } from './useTutorialDetection';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── TutorialLayer ───────────────────────────────────────────────────────────
// Global overlay that drives a running lesson: applies each step's
// preconditions as it arrives, spotlights its target region, detects the
// correct adjustment, celebrates, and auto-advances. Mounted once in DawApp.
// Renders nothing when no tutorial is active. A lesson resumed with its draft
// (milestone 1.15) carries on at its step, over the view the draft kept.

// The pulses animate opacity only (the spotlight's is the wider glow over its
// ring) and the rainbow spins with transform, so all run on the compositor.
// None is defined, nor used, under prefers-reduced-motion.
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

  const tutorial = useMemo(() => getTutorial(activeId), [activeId]);
  const total = tutorial?.steps.length ?? 0;
  const step = tutorial ? (tutorial.steps[stepIndex] ?? null) : null;
  const isLast = tutorial ? stepIndex >= total - 1 : false;
  const isValidated = !!(step?.check || step?.synthCheck);

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
      // A modal under a lesson (the Add effect picker) lets the coach card
      // take clicks and focus without closing (DawDialog).
      data-tutorial-layer=""
      style={{
        position: 'fixed',
        inset: 0,
        // Over menus, popovers and tooltips (tokens.ts Z), so the spotlight
        // can ring a menu row and the dim covers the rest.
        zIndex: 'var(--daw-z-tutorial)',
        pointerEvents: 'none',
      }}
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
